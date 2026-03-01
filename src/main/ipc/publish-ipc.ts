import { ipcMain, BrowserWindow } from 'electron'
import {
  getAccount,
  createTask,
  createPublishLog,
  updatePublishLog,
  listPublishLogs,
  updateTaskStatus
} from '../db'
import { startWorker, sendToWorker, stopWorker, addWorkerListener } from '../worker-bridge'
import type { WorkerEvent, PlatformType } from '../../worker/platforms/types'

export function registerPublishIPC(mainWindow: BrowserWindow): void {
  ipcMain.handle('publish:start', async (_e, input: {
    title: string
    description: string
    tags: string[]
    videoPath: string
    coverPath?: string
    scheduledTime?: string
    platforms: { platform: string; accountId: number }[]
  }) => {
    // 1. 创建发布任务
    const task = createTask(
      input.title,
      input.description,
      input.tags,
      input.videoPath,
      input.coverPath
    )

    // 2. 为每个平台+账号创建发布日志
    const logMap = new Map<string, number>()
    for (const { platform, accountId } of input.platforms) {
      const log = createPublishLog(task.id, platform, accountId)
      logMap.set(`${platform}_${accountId}`, log.id)
    }

    // 3. 启动 Worker
    startWorker(mainWindow)

    // 4. 监听 result 事件更新数据库
    let completedCount = 0
    let failedCount = 0
    const totalCount = input.platforms.length
    const cleanup = addWorkerListener((event: WorkerEvent) => {
      if (event.type === 'result' && event.taskId === task.id) {
        const key = `${event.platform}_${event.accountId}`
        const logId = logMap.get(key)
        if (logId) {
          updatePublishLog(
            logId,
            event.success ? 'success' : 'failed',
            event.url,
            event.error
          )
        }

        if (!event.success) failedCount++
        completedCount++
        if (completedCount >= totalCount) {
          cleanup()
          const status = failedCount === totalCount ? 'failed'
            : failedCount > 0 ? 'partial'
            : 'completed'
          updateTaskStatus(task.id, status)
        }
      }
    })

    // 5. 发送发布命令到 Worker（并发执行）
    for (const { platform, accountId } of input.platforms) {
      const account = getAccount(accountId)
      if (!account) continue

      sendToWorker({
        type: 'publish',
        taskId: task.id,
        platform: platform as PlatformType,
        accountId,
        profileDir: account.profile_dir,
        options: {
          title: input.title,
          description: input.description,
          tags: input.tags,
          videoPath: input.videoPath,
          coverPath: input.coverPath,
          scheduledTime: input.scheduledTime
        }
      })
    }

    return { taskId: task.id }
  })

  ipcMain.handle('publish:cancel', async () => {
    stopWorker()
    return { success: true }
  })

  ipcMain.handle('publish:history', async (_e, limit = 50, offset = 0) => {
    return listPublishLogs(limit, offset)
  })
}
