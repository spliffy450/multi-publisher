import Database from 'better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'

let db: Database.Database | null = null

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  platform        TEXT    NOT NULL,
  name            TEXT    NOT NULL,
  profile_dir     TEXT    NOT NULL UNIQUE,
  is_logged_in    INTEGER DEFAULT 0,
  last_login_check TEXT,
  created_at      TEXT    DEFAULT (datetime('now', 'localtime')),
  updated_at      TEXT    DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_platform ON accounts(platform);

CREATE TABLE IF NOT EXISTS tasks (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT    NOT NULL,
  description         TEXT,
  tags                TEXT,
  video_path          TEXT    NOT NULL,
  cover_path          TEXT,
  cover_vertical_path TEXT,
  scheduled_time      TEXT,
  status              TEXT    DEFAULT 'pending',
  created_at          TEXT    DEFAULT (datetime('now', 'localtime')),
  completed_at        TEXT
);

CREATE TABLE IF NOT EXISTS publish_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  platform    TEXT    NOT NULL,
  account_id  INTEGER REFERENCES accounts(id) ON DELETE SET NULL,
  status      TEXT    DEFAULT 'pending',
  result_url  TEXT,
  error       TEXT,
  duration_ms INTEGER,
  started_at  TEXT,
  finished_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_logs_task ON publish_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON publish_logs(status);
`

export function getDBPath(): string {
  const dataDir = app.isPackaged
    ? join(app.getPath('userData'), 'data')
    : join(app.getAppPath(), 'data')

  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true })
  }
  return join(dataDir, 'app.db')
}

export function initDB(): Database.Database {
  if (db) return db
  const dbPath = getDBPath()
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  return db
}

export function getDB(): Database.Database {
  if (!db) throw new Error('Database not initialized. Call initDB() first.')
  return db
}

// === Account CRUD ===

export interface AccountRow {
  id: number
  platform: string
  name: string
  profile_dir: string
  is_logged_in: number
  last_login_check: string | null
  created_at: string
  updated_at: string
}

export function listAccounts(): AccountRow[] {
  return getDB().prepare('SELECT * FROM accounts ORDER BY platform, id').all() as AccountRow[]
}

export function getAccount(id: number): AccountRow | undefined {
  return getDB().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as AccountRow | undefined
}

export function createAccount(platform: string, name: string, profileDir: string): AccountRow {
  const stmt = getDB().prepare(
    'INSERT INTO accounts (platform, name, profile_dir) VALUES (?, ?, ?)'
  )
  const result = stmt.run(platform, name, profileDir)
  return getAccount(result.lastInsertRowid as number)!
}

export function updateAccountLogin(id: number, loggedIn: boolean): void {
  getDB().prepare(
    `UPDATE accounts SET is_logged_in = ?, last_login_check = datetime('now','localtime'),
     updated_at = datetime('now','localtime') WHERE id = ?`
  ).run(loggedIn ? 1 : 0, id)
}

export function removeAccount(id: number): void {
  getDB().prepare('DELETE FROM accounts WHERE id = ?').run(id)
}

// === Task CRUD ===

export interface TaskRow {
  id: number
  title: string
  description: string | null
  tags: string | null
  video_path: string
  cover_path: string | null
  cover_vertical_path: string | null
  scheduled_time: string | null
  status: string
  created_at: string
  completed_at: string | null
}

export function createTask(
  title: string,
  description: string,
  tags: string[],
  videoPath: string,
  coverPath?: string,
  coverVerticalPath?: string,
  scheduledTime?: string
): TaskRow {
  const stmt = getDB().prepare(
    `INSERT INTO tasks (title, description, tags, video_path, cover_path, cover_vertical_path, scheduled_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  const result = stmt.run(
    title, description, JSON.stringify(tags), videoPath,
    coverPath ?? null, coverVerticalPath ?? null, scheduledTime ?? null
  )
  return getDB().prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid) as TaskRow
}

export function updateTaskStatus(id: number, status: string): void {
  if (status === 'completed') {
    getDB().prepare(
      `UPDATE tasks SET status = ?, completed_at = datetime('now','localtime') WHERE id = ?`
    ).run(status, id)
  } else {
    getDB().prepare(
      `UPDATE tasks SET status = ?, completed_at = NULL WHERE id = ?`
    ).run(status, id)
  }
}

// === Publish Log CRUD ===

export interface PublishLogRow {
  id: number
  task_id: number
  platform: string
  account_id: number
  status: string
  result_url: string | null
  error: string | null
  duration_ms: number | null
  started_at: string | null
  finished_at: string | null
}

export function createPublishLog(taskId: number, platform: string, accountId: number): PublishLogRow {
  const stmt = getDB().prepare(
    'INSERT INTO publish_logs (task_id, platform, account_id) VALUES (?, ?, ?)'
  )
  const result = stmt.run(taskId, platform, accountId)
  return getDB().prepare('SELECT * FROM publish_logs WHERE id = ?').get(result.lastInsertRowid) as PublishLogRow
}

export function updatePublishLog(
  id: number,
  status: string,
  resultUrl?: string,
  error?: string,
  durationMs?: number
): void {
  getDB().prepare(
    `UPDATE publish_logs
     SET status = ?, result_url = ?, error = ?, duration_ms = ?,
         finished_at = CASE WHEN ? IN ('success','failed') THEN datetime('now','localtime') ELSE finished_at END,
         started_at = CASE WHEN started_at IS NULL AND ? = 'uploading' THEN datetime('now','localtime') ELSE started_at END
     WHERE id = ?`
  ).run(status, resultUrl ?? null, error ?? null, durationMs ?? null, status, status, id)
}

export function listPublishLogs(limit = 50, offset = 0): PublishLogRow[] {
  return getDB().prepare(
    `SELECT pl.*, t.title as task_title FROM publish_logs pl
     LEFT JOIN tasks t ON pl.task_id = t.id
     ORDER BY pl.id DESC LIMIT ? OFFSET ?`
  ).all(limit, offset) as PublishLogRow[]
}
