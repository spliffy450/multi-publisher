import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { mkdirSync, existsSync, rmSync } from 'fs'
import {
  listAccounts,
  getAccount,
  createAccount,
  updateAccountLogin,
  removeAccount as dbRemoveAccount
} from '../db'
import { startWorker, sendToWorker, addWorkerListener } from '../worker-bridge'
import type { WorkerEvent, PlatformType } from '../../worker/platforms/types'

const PLATFORM_LOGIN_URLS: Record<string, string> = {
  bilibili: 'https://passport.bilibili.com/login',
  douyin: 'https://creator.douyin.com',
  xiaohongshu: 'https://creator.xiaohongshu.com',
  kuaishou: 'https://cp.kuaishou.com'
}

function getProfilesDir(): string {
  const dir = app.isPackaged
    ? join(app.getPath('userData'), 'profiles')
    : join(app.getAppPath(), 'profiles')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return dir
}

export function registerAccountIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle('account:list', async () => {
    return listAccounts()
  })

  ipcMain.handle('account:add', async (_e, platform: string, name: string) => {
    const profileDir = join(getProfilesDir(), `${platform}_${Date.now()}`)
    mkdirSync(profileDir, { recursive: true })
    return createAccount(platform, name, profileDir)
  })

  ipcMain.handle('account:remove', async (_e, id: number) => {
    const account = getAccount(id)
    if (account) {
      try {
        if (existsSync(account.profile_dir)) {
          rmSync(account.profile_dir, { recursive: true, force: true })
        }
      } catch {
        // 忽略目录删除失败
      }
      dbRemoveAccount(id)
    }
    return { success: true }
  })

  ipcMain.handle('account:login', async (_e, accountId: number) => {
    const account = getAccount(accountId)
    if (!account) return { success: false, error: '账号不存在' }

    const loginUrl = PLATFORM_LOGIN_URLS[account.platform]
    if (!loginUrl) return { success: false, error: '不支持的平台' }

    startWorker(mainWindow)
    sendToWorker({
      type: 'login',
      platform: account.platform as PlatformType,
      profileDir: account.profile_dir,
      loginUrl
    })

    // 监听浏览器关闭后自动检查登录态（用 profileDir 精确匹配，避免多账号冲突）
    const cleanup = addWorkerListener((event: WorkerEvent) => {
      if (event.type === 'loginClosed' && event.profileDir === account.profile_dir) {
        cleanup()
        // 浏览器关闭 → 自动检查登录
        sendToWorker({
          type: 'checkLogin',
          platform: account.platform as PlatformType,
          profileDir: account.profile_dir
        })
        const cleanup2 = addWorkerListener((evt: WorkerEvent) => {
          if (evt.type === 'loginStatus' && evt.profileDir === account.profile_dir) {
            cleanup2()
            updateAccountLogin(accountId, evt.loggedIn)
            if (!mainWindow.isDestroyed()) {
              mainWindow.webContents.send('account:statusUpdate', {
                accountId,
                loggedIn: evt.loggedIn
              })
            }
          }
        })
      }
    })

    return { success: true }
  })

  ipcMain.handle('account:checkLogin', async (_e, accountId: number) => {
    const account = getAccount(accountId)
    if (!account) return { loggedIn: false }

    startWorker(mainWindow)
    sendToWorker({
      type: 'checkLogin',
      platform: account.platform as PlatformType,
      profileDir: account.profile_dir
    })

    return new Promise<{ loggedIn: boolean }>((resolve) => {
      const timeout = setTimeout(() => {
        cleanup()
        resolve({ loggedIn: false })
      }, 30000)

      const cleanup = addWorkerListener((event: WorkerEvent) => {
        if (event.type === 'loginStatus' && event.profileDir === account.profile_dir) {
          cleanup()
          clearTimeout(timeout)
          updateAccountLogin(accountId, event.loggedIn)
          resolve({ loggedIn: event.loggedIn })
        }
      })
    })
  })
}
