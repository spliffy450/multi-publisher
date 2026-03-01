import type { PlatformAdapter, PublishOptions, PublishResult, ProgressCallback } from './types'
import type { Page } from 'playwright-core'
import { randomDelay, humanClick, withTimeout } from '../humanize'

export const kuaishou: PlatformAdapter = {
  name: 'kuaishou',
  loginUrl: 'https://cp.kuaishou.com',
  uploadUrl: 'https://cp.kuaishou.com/article/publish/video',

  async checkLogin(page: Page): Promise<boolean> {
    await page.goto('https://cp.kuaishou.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    })
    await randomDelay(2000, 3000)

    // 未登录会跳转到登录页或出现登录弹窗
    const isLoginPage = page.url().includes('login') || page.url().includes('passport')
    const hasLoginPrompt = await page
      .locator('[class*="login"], [class*="qrcode"], :text("扫码登录"), :text("请登录")')
      .count()

    return !isLoginPage && hasLoginPrompt === 0
  },

  async publish(
    page: Page,
    options: PublishOptions,
    onProgress: ProgressCallback
  ): Promise<PublishResult> {
    const start = Date.now()

    try {
      // 1. 打开发布页
      onProgress('uploading', '正在打开快手创作者平台...')
      await page.goto(this.uploadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await randomDelay(2000, 4000)

      // 2. 上传视频文件
      onProgress('uploading', '正在上传视频...', 10)
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(options.videoPath)

      // 3. 等待上传完成
      onProgress('uploading', '视频上传中，请稍候...', 30)
      await withTimeout(
        page.waitForSelector(
          ':text("重新上传"), :text("上传完成"), :text("更换视频"), [class*="reupload"]',
          { timeout: 600000 }
        ),
        600000,
        '快手视频上传'
      )
      onProgress('filling', '视频上传完成，填写信息...', 70)
      await randomDelay(3000, 5000)

      // 4. 填写标题/描述
      const descEditor = page.locator(
        '.ql-editor, [contenteditable="true"], [class*="desc"] textarea, [class*="title"] input'
      ).first()
      if (await descEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descEditor.click()
        await randomDelay(300, 500)

        // 清空已有内容
        await page.keyboard.press('Control+a')
        await page.keyboard.press('Backspace')
        await randomDelay(200, 400)

        // 输入描述（快手标题和描述通常在同一个编辑框）
        const content = options.title + '\n' + options.description
        await page.keyboard.type(content, { delay: 30 })
        await randomDelay(500, 1000)
      }

      // 5. 添加话题标签
      for (const tag of options.tags.slice(0, 5)) {
        try {
          await page.keyboard.type(` #${tag}`, { delay: 60 })
          await randomDelay(800, 1500)

          // 等待话题建议
          const suggestion = page.locator(
            '[class*="suggest"] li, [class*="mention"] div, [class*="topic-item"]'
          ).first()
          if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
            await suggestion.click()
          } else {
            await page.keyboard.press('Escape')
          }
          await randomDelay(300, 600)
        } catch {
          // 标签添加失败不影响发布
        }
      }

      // 6. 上传封面（可选）
      if (options.coverPath) {
        try {
          const coverBtn = page.locator(
            ':text("设置封面"), :text("更换封面"), [class*="cover"] button'
          ).first()
          if (await coverBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await coverBtn.click()
            await randomDelay(1000, 2000)

            const coverInput = page.locator('input[accept*="image"]').first()
            if (await coverInput.count() > 0) {
              await coverInput.setInputFiles(options.coverPath)
              await randomDelay(2000, 3000)

              const confirmBtn = page.locator(
                'button:has-text("完成"), button:has-text("确认")'
              ).first()
              if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                await confirmBtn.click()
                await randomDelay(1000, 2000)
              }
            }
          }
        } catch {
          // 封面上传失败不影响发布
        }
      }

      // 7. 点击发布
      onProgress('publishing', '正在发布...', 90)
      await randomDelay(1500, 3000)
      const publishBtn = page.locator(
        'button:has-text("发布"), [class*="publish-btn"], [class*="submit"]'
      ).first()
      await humanClick(page, publishBtn)

      // 8. 等待发布完成
      await withTimeout(
        Promise.race([
          page.waitForURL('**/manage**', { timeout: 30000 }),
          page.waitForSelector(':text("发布成功"), :text("作品发布成功")', { timeout: 30000 })
        ]),
        45000,
        '快手发布确认'
      )

      onProgress('success', '发布成功', 100)
      return {
        success: true,
        url: page.url(),
        duration: Date.now() - start
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - start
      }
    }
  }
}
