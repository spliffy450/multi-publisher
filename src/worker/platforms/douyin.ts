import type { PlatformAdapter, PublishOptions, PublishResult, ProgressCallback } from './types'
import type { Page } from 'playwright-core'
import { randomDelay, humanClick, withTimeout } from '../humanize'

export const douyin: PlatformAdapter = {
  name: 'douyin',
  loginUrl: 'https://creator.douyin.com',
  uploadUrl: 'https://creator.douyin.com/creator-micro/content/upload',

  async checkLogin(page: Page): Promise<boolean> {
    await page.goto('https://creator.douyin.com/creator-micro/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    })
    await randomDelay(2000, 4000)

    // 检查是否有登录弹窗或跳转
    const hasLoginPrompt = await page
      .locator('[class*="login"], [class*="qrcode"], :text("扫码登录"), :text("请登录")')
      .count()
    const isLoginPage = page.url().includes('login')

    return hasLoginPrompt === 0 && !isLoginPage
  },

  async publish(
    page: Page,
    options: PublishOptions,
    onProgress: ProgressCallback
  ): Promise<PublishResult> {
    const start = Date.now()

    try {
      // 1. 打开上传页
      onProgress('uploading', '正在打开抖音创作者平台...')
      await page.goto(this.uploadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await randomDelay(3000, 5000)

      // 2. 上传视频文件
      onProgress('uploading', '正在上传视频...', 10)
      // 抖音上传 input 可能在 container div 内
      const fileInput = page.locator(
        "div[class^='container'] input[type='file'], input[accept*='video']"
      ).first()
      await fileInput.setInputFiles(options.videoPath)

      // 3. 等待上传完成
      onProgress('uploading', '视频上传中，请稍候...', 30)
      await withTimeout(
        page.waitForSelector(':text("重新上传"), :text("上传完成"), :text("更换视频")', {
          timeout: 600000
        }),
        600000,
        '抖音视频上传'
      )
      onProgress('filling', '视频上传完成，填写信息...', 70)
      await randomDelay(3000, 5000)

      // 等待页面跳转到发布表单页
      await page.waitForURL(/\/(upload|publish|post)/, { timeout: 15000 }).catch(() => {})

      // 4. 填写标题
      const titleInput = page.locator(
        'input[placeholder*="标题"], [class*="title"] input, [class*="title-input"]'
      ).first()
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.clear()
        await titleInput.fill(options.title)
        await randomDelay(500, 1000)
      }

      // 5. 填写描述
      const descEditor = page.locator(
        '.ql-editor, [contenteditable="true"], [class*="desc"] textarea'
      ).first()
      if (await descEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await descEditor.click()
        // 清空已有内容
        await page.keyboard.press('Control+a')
        await page.keyboard.press('Backspace')
        await randomDelay(300, 500)

        // 输入描述
        await page.keyboard.type(options.description, { delay: 30 })
        await randomDelay(500, 1000)
      }

      // 6. 添加话题标签
      for (const tag of options.tags.slice(0, 5)) {
        try {
          const tagArea = page.locator(
            '.zone-container, [class*="hashtag"], [class*="topic"]'
          ).first()
          if (await tagArea.isVisible({ timeout: 2000 }).catch(() => false)) {
            await tagArea.click()
            await page.keyboard.type(`#${tag}`, { delay: 80 })
            await randomDelay(800, 1500)

            // 等待建议列表
            const suggestion = page.locator(
              '[class*="suggest"] li, [class*="mention-list"] div, [class*="search-list"] div'
            ).first()
            if (await suggestion.isVisible({ timeout: 2000 }).catch(() => false)) {
              await suggestion.click()
            } else {
              await page.keyboard.press('Escape')
            }
            await randomDelay(300, 600)
          }
        } catch {
          // 标签添加失败不影响发布
        }
      }

      // 7. 上传封面（可选）
      if (options.coverPath) {
        try {
          const coverBtn = page.locator(
            ':text("选择封面"), :text("更换封面"), [class*="cover-select"]'
          ).first()
          if (await coverBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await coverBtn.click()
            await randomDelay(1000, 2000)

            const coverInput = page.locator(
              '.semi-upload-hidden-input, input[accept*="image"]'
            ).first()
            if (await coverInput.count() > 0) {
              await coverInput.setInputFiles(options.coverPath)
              await randomDelay(2000, 3000)

              // 确认封面
              const confirmBtn = page.locator('button:has-text("完成"), button:has-text("确认")').first()
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

      // 8. 定时发布（可选）
      if (options.scheduledTime) {
        try {
          const scheduleToggle = page.locator('label:has-text("定时发布")').first()
          if (await scheduleToggle.isVisible({ timeout: 2000 }).catch(() => false)) {
            await scheduleToggle.click()
            await randomDelay(500, 1000)

            const timeInput = page.locator('.semi-input[placeholder*="日期"]').first()
            if (await timeInput.isVisible()) {
              await timeInput.click()
              await timeInput.fill(options.scheduledTime)
              await randomDelay(500, 1000)
            }
          }
        } catch {
          // 定时发布设置失败不影响立即发布
        }
      }

      // 9. 点击发布
      onProgress('publishing', '正在发布...', 90)
      await randomDelay(1000, 2000)
      const publishBtn = page.locator(
        'button:has-text("发布"), [class*="publish-btn"], button[class*="submit"]'
      ).first()
      await humanClick(page, publishBtn)

      // 10. 等待发布成功（跳转到内容管理页）
      await withTimeout(
        page.waitForURL('**/manage**', { timeout: 30000 }).catch(() =>
          page.waitForSelector(':text("发布成功"), :text("作品发布成功")', { timeout: 15000 })
        ),
        45000,
        '抖音发布确认'
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
