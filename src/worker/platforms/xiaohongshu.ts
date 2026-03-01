import type { PlatformAdapter, PublishOptions, PublishResult, ProgressCallback } from './types'
import type { Page } from 'playwright-core'
import { randomDelay, humanClick, withTimeout } from '../humanize'

export const xiaohongshu: PlatformAdapter = {
  name: 'xiaohongshu',
  loginUrl: 'https://creator.xiaohongshu.com',
  uploadUrl: 'https://creator.xiaohongshu.com/publish/publish',

  async checkLogin(page: Page): Promise<boolean> {
    await page.goto('https://creator.xiaohongshu.com', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    })
    await randomDelay(2000, 3000)

    // 未登录会出现登录按钮或登录页
    const hasLogin = await page
      .locator(':text("登录"), [class*="login-btn"], [class*="qrcode"]')
      .count()
    return hasLogin === 0 && !page.url().includes('login')
  },

  async publish(
    page: Page,
    options: PublishOptions,
    onProgress: ProgressCallback
  ): Promise<PublishResult> {
    const start = Date.now()

    try {
      // 1. 打开发布页
      onProgress('uploading', '正在打开小红书创作者平台...')
      await page.goto(this.uploadUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await randomDelay(2000, 4000)

      // 确保在"上传视频"模式
      const videoTab = page.locator(
        ':text("上传视频"), [class*="tab"]:has-text("视频"), [class*="upload-tab"]:has-text("视频")'
      ).first()
      if (await videoTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await videoTab.click()
        await randomDelay(500, 1000)
      }

      // 2. 上传视频文件
      onProgress('uploading', '正在上传视频...', 10)
      const fileInput = page.locator('input[type="file"]').first()
      await fileInput.setInputFiles(options.videoPath)

      // 3. 等待上传完成
      onProgress('uploading', '视频上传中，请稍候...', 30)
      await withTimeout(
        page.waitForSelector(
          ':text("重新上传"), :text("上传完成"), :text("重新选择"), [class*="reupload"]',
          { timeout: 600000 }
        ),
        600000,
        '小红书视频上传'
      )
      onProgress('filling', '视频上传完成，填写信息...', 70)
      await randomDelay(3000, 5000)

      // 4. 填写标题
      const titleInput = page.locator(
        'input[placeholder*="标题"], [class*="title"] input, [class*="c-input_titleInput"]'
      ).first()
      if (await titleInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await titleInput.clear()
        await titleInput.fill(options.title)
        await randomDelay(500, 1000)
      }

      // 5. 填写正文 + 标签
      const contentEditor = page.locator(
        '.ql-editor, [contenteditable="true"], [class*="post-content"] [contenteditable]'
      ).first()
      if (await contentEditor.isVisible({ timeout: 3000 }).catch(() => false)) {
        await contentEditor.click()
        await randomDelay(300, 500)

        // 输入描述
        await page.keyboard.type(options.description, { delay: 30 })

        // 追加标签
        for (const tag of options.tags.slice(0, 10)) {
          await page.keyboard.type(` #${tag}`, { delay: 60 })
          await randomDelay(500, 1000)

          // 等待标签建议
          const suggestion = page.locator(
            '[class*="suggest"], [class*="mention"], [class*="at-list"] div'
          ).first()
          if (await suggestion.isVisible({ timeout: 1500 }).catch(() => false)) {
            await suggestion.click()
          }
          await randomDelay(300, 500)
        }
      }

      // 6. 上传封面（可选）
      if (options.coverPath) {
        try {
          const coverBtn = page.locator(
            ':text("更换封面"), :text("选择封面"), [class*="cover"] button'
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
        'button:has-text("发布"), [class*="publishBtn"], [class*="publish-btn"]'
      ).first()
      await humanClick(page, publishBtn)

      // 8. 等待发布完成
      await withTimeout(
        Promise.race([
          page.waitForURL('**/manage**', { timeout: 30000 }),
          page.waitForSelector(':text("发布成功"), :text("笔记发布成功")', { timeout: 30000 })
        ]),
        45000,
        '小红书发布确认'
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
