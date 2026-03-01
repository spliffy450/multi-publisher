import { fork, ChildProcess } from 'child_process'
import { join } from 'path'
import { BrowserWindow } from 'electron'
import type { WorkerCommand, WorkerEvent } from '../worker/platforms/types'

let workerProcess: ChildProcess | null = null
let mainWindowRef: BrowserWindow | null = null

type EventListener = (event: WorkerEvent) => void
const eventListeners: EventListener[] = []

function getWorkerPath(): string {
  return join(__dirname, '../worker/index.js')
}

export function startWorker(mainWindow: BrowserWindow): ChildProcess {
  mainWindowRef = mainWindow
  if (workerProcess && !workerProcess.killed) {
    return workerProcess
  }

  const workerPath = getWorkerPath()
  workerProcess = fork(workerPath, [], {
    stdio: ['pipe', 'pipe', 'pipe', 'ipc']
  })

  workerProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[worker:stdout]', data.toString().trim())
  })

  workerProcess.stderr?.on('data', (data: Buffer) => {
    console.error('[worker:stderr]', data.toString().trim())
  })

  workerProcess.on('message', (event: WorkerEvent) => {
    // 转发 publish 相关事件到 renderer（转换为统一格式）
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      if (event.type === 'progress') {
        mainWindowRef.webContents.send('publish:progress', {
          platform: event.platform,
          accountId: event.accountId,
          status: event.status,
          message: event.message,
          percent: event.percent
        })
      } else if (event.type === 'result') {
        mainWindowRef.webContents.send('publish:progress', {
          platform: event.platform,
          accountId: event.accountId,
          status: event.success ? 'success' : 'failed',
          resultUrl: event.url,
          error: event.error
        })
      }
    }

    // 通知所有内部监听器（供 account-ipc / publish-ipc 使用）
    for (const listener of eventListeners) {
      try {
        listener(event)
      } catch {
        // 静默处理监听器错误
      }
    }
  })

  workerProcess.on('exit', (code) => {
    console.log(`[worker] exited with code ${code}`)
    workerProcess = null
  })

  return workerProcess
}

export function sendToWorker(command: WorkerCommand): void {
  if (!workerProcess || workerProcess.killed) {
    throw new Error('Worker process is not running')
  }
  workerProcess.send(command)
}

export function stopWorker(): void {
  if (workerProcess && !workerProcess.killed) {
    workerProcess.send({ type: 'cancel' } as WorkerCommand)
    setTimeout(() => {
      if (workerProcess && !workerProcess.killed) {
        workerProcess.kill()
      }
    }, 3000)
  }
}

export function getWorkerProcess(): ChildProcess | null {
  return workerProcess
}

/** 注册内部事件监听器，返回取消函数 */
export function addWorkerListener(listener: EventListener): () => void {
  eventListeners.push(listener)
  return () => {
    const idx = eventListeners.indexOf(listener)
    if (idx >= 0) eventListeners.splice(idx, 1)
  }
}
