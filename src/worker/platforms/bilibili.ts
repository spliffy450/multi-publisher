import type { PlatformAdapter, PublishOptions, PublishResult, ProgressCallback } from './types'
import type { Page } from 'playwright-core'
import { randomDelay, humanClick, withTimeout } from '../humanize'

export const bilibili: PlatformAdapter = {
  name: 'bilibili',
  loginUrl: 'https://passport.bilibili.com/login',
  uploadUrl: 'https://member.bilibili.com/platform/upload/video/frame',

  async checkLogin(page: Page): Promise<boolean> {
    await page.goto('https://member.bilibili.com/platform/home', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    })
    await randomDelay(2000, 3000)
    // 未登录会被重定向到 passport.bilibili.com
    return !page.url().includes('passport.bilibili.com')
  },

  async publish(
    page: Page,
    options: PublishOptions,
    onProgress: ProgressCallback
  ): Promise<PublishResult> {
    const start = Date.now()

    try {
      // 1. 打开上传页
      onProgress('uploading', '正在打开B站上传页面...')
      await page.goto(this.uploadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await randomDelay(2000, 4000)

      // 2. 上传视频文件
      onProgress('uploading', '正在上传视频...', 10)
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(options.videoPath)

      // 3. 等待上传完成（最长10分钟）
      onProgress('uploading', '视频上传中，请稍候...', 30)
      await withTimeout(
        page.waitForSelector('.upload-success, :text("上传完成"), :text("重新上传")', {
          timeout: 600000
        }),
        600000,
        'B站视频上传'
      )
      onProgress('filling', '视频上传完成，填写信息...', 70)
      await randomDelay(2000, 4000)

      // 4. 填写标题
      const titleInput = page.locator(
        '.video-title input, input[maxlength="80"], input[placeholder*="标题"]'
      ).first()
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.clear()
        await titleInput.fill(options.title)
        await randomDelay(500, 1000)
      }

      // 5. 填写简介
      if (options.description) {
        const descInput = page.locator(
          'textarea[placeholder*="简介"], .ql-editor, [contenteditable="true"]'
        ).first()
        if (await descInput.isVisible({ timeout: 3000 }).catch(() => false)) {
          await descInput.click()
          await descInput.fill(options.description)
          await randomDelay(500, 1000)
        }
      }

      // 6. 添加标签（最多10个）
      for (const tag of options.tags.slice(0, 10)) {
        const tagInput = page.locator(
          '.tag-container input, input[placeholder*="标签"], input[placeholder*="Tag"]'
        ).first()
        if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await tagInput.fill(tag)
          await page.keyboard.press('Enter')
          await randomDelay(300, 600)
        }
      }

      // 7. 上传封面（可选）
      if (options.coverPath) {
        const coverInput = page.locator(
          '.cover-upload input[type="file"], .cover-item input[type="file"]'
        ).first()
        if (await coverInput.count() > 0) {
          await coverInput.setInputFiles(options.coverPath)
          await randomDelay(2000, 3000)
        }
      }

      // 8. 点击投稿
      onProgress('publishing', '正在发布...', 90)
      await randomDelay(1000, 2000)
      const submitBtn = page.locator(
        'button:has-text("投稿"), .submit-add, [class*="submit"]'
      ).first()
      await humanClick(page, submitBtn)

      // 9. 等待发布成功
      await page.waitForURL('**/success**', { timeout: 30000 }).catch(() => {
        // 也可能不跳转，检查成功提示
        return page.waitForSelector(':text("投稿成功"), :text("稿件投递成功")', {
          timeout: 15000
        })
      })

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
