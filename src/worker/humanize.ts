import type { Page, Locator } from 'playwright-core'

/** 随机延迟 */
export function randomDelay(min = 500, max = 2000): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min)
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** 模拟人类打字（逐字输入） */
export async function humanType(target: Page | Locator, text: string): Promise<void> {
  for (const char of text) {
    const delay = Math.floor(Math.random() * 100 + 50)
    if ('keyboard' in target) {
      await (target as Page).keyboard.type(char, { delay })
    } else {
      await (target as Locator).pressSequentially(char, { delay })
    }
  }
}

/** 模拟鼠标移动后点击 */
export async function humanClick(page: Page, locator: Locator): Promise<void> {
  const box = await locator.boundingBox()
  if (!box) {
    await locator.click()
    return
  }

  const x = box.x + box.width * (0.3 + Math.random() * 0.4)
  const y = box.y + box.height * (0.3 + Math.random() * 0.4)

  await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 5 + 3) })
  await randomDelay(100, 300)
  await page.mouse.click(x, y)
}

/** 页面预热 */
export async function warmup(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await randomDelay(2000, 4000)
  await page.mouse.move(
    300 + Math.random() * 400,
    200 + Math.random() * 200
  )
  await randomDelay(500, 1000)
}

/** 带超时的 Promise 包装 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  msg: string
): Promise<T> {
  const timer = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`超时: ${msg} (${ms}ms)`)), ms)
  )
  return Promise.race([promise, timer])
}
