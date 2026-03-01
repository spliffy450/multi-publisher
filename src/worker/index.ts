import { launchBrowser, closeBrowser } from './browser-manager'
import type { WorkerCommand, WorkerEvent, PlatformAdapter } from './platforms/types'
import { bilibili } from './platforms/bilibili'
import { douyin } from './platforms/douyin'
import { xiaohongshu } from './platforms/xiaohongshu'
import { kuaishou } from './platforms/kuaishou'

const adapters: Record<string, PlatformAdapter> = {
  bilibili,
  douyin,
  xiaohongshu,
  kuaishou
}

function send(event: WorkerEvent): void {
  process.send?.(event)
}

async function handlePublish(msg: Extract<WorkerCommand, { type: 'publish' }>): Promise<void> {
  const adapter = adapters[msg.platform]
  if (!adapter) {
    send({
      type: 'result',
      taskId: msg.taskId,
      platform: msg.platform,
      accountId: msg.accountId,
      success: false,
      error: `不支持的平台: ${msg.platform}`
    })
    return
  }

  let context
  try {
    send({
      type: 'progress',
      taskId: msg.taskId,
      platform: msg.platform,
      accountId: msg.accountId,
      status: 'launching',
      message: '正在启动浏览器...'
    })

    context = await launchBrowser({ profileDir: msg.profileDir })
    const page = context.pages()[0] || (await context.newPage())

    // 检查登录态
    const loggedIn = await adapter.checkLogin(page)
    if (!loggedIn) {
      send({
        type: 'result',
        taskId: msg.taskId,
        platform: msg.platform,
        accountId: msg.accountId,
        success: false,
        error: '未登录，请先在账号管理中登录'
      })
      return
    }

    // 执行发布
    const result = await adapter.publish(page, msg.options, (status, message, percent) => {
      send({
        type: 'progress',
        taskId: msg.taskId,
        platform: msg.platform,
        accountId: msg.accountId,
        status,
        message,
        percent
      })
    })

    send({
      ...result,
      type: 'result',
      taskId: msg.taskId,
      platform: msg.platform,
      accountId: msg.accountId
    })
  } catch (err) {
    send({
      type: 'result',
      taskId: msg.taskId,
      platform: msg.platform,
      accountId: msg.accountId,
      success: false,
      error: err instanceof Error ? err.message : String(err)
    })
  } finally {
    if (context) await closeBrowser(context)
  }
}

async function handleLogin(msg: Extract<WorkerCommand, { type: 'login' }>): Promise<void> {
  try {
    const context = await launchBrowser({ profileDir: msg.profileDir })
    const page = context.pages()[0] || (await context.newPage())
    await page.goto(msg.loginUrl, { waitUntil: 'domcontentloaded' })

    // 用户手动登录，关闭浏览器时通知
    context.on('close', () => {
      send({ type: 'loginClosed', platform: msg.platform, profileDir: msg.profileDir })
    })
  } catch (err) {
    console.error('[worker] login error:', err)
    send({ type: 'loginStatus', platform: msg.platform, profileDir: msg.profileDir, loggedIn: false })
  }
}

async function handleCheckLogin(
  msg: Extract<WorkerCommand, { type: 'checkLogin' }>
): Promise<void> {
  const adapter = adapters[msg.platform]
  if (!adapter) {
    send({ type: 'loginStatus', platform: msg.platform, profileDir: msg.profileDir, loggedIn: false })
    return
  }

  let context
  try {
    context = await launchBrowser({ profileDir: msg.profileDir })
    const page = context.pages()[0] || (await context.newPage())
    const loggedIn = await adapter.checkLogin(page)
    send({ type: 'loginStatus', platform: msg.platform, profileDir: msg.profileDir, loggedIn })
  } catch {
    send({ type: 'loginStatus', platform: msg.platform, profileDir: msg.profileDir, loggedIn: false })
  } finally {
    if (context) await closeBrowser(context)
  }
}

// 消息监听
process.on('message', async (msg: WorkerCommand) => {
  try {
    switch (msg.type) {
      case 'publish':
        await handlePublish(msg)
        break
      case 'login':
        await handleLogin(msg)
        break
      case 'checkLogin':
        await handleCheckLogin(msg)
        break
      case 'cancel':
        process.exit(0)
    }
  } catch (err) {
    console.error('[worker] unhandled error:', err)
  }
})

console.log('[worker] Browser worker process started')
