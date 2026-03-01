import type { BrowserContext } from 'playwright-core'

// 使用动态 import，允许在 patchright 不可用时回退到 playwright
let chromiumModule: typeof import('playwright-core').chromium | null = null

async function getChromium() {
  if (chromiumModule) return chromiumModule

  try {
    // 优先使用 patchright（反检测版）
    const patchright = await import('patchright')
    chromiumModule = patchright.chromium
    console.log('[browser] Using patchright (anti-detect)')
  } catch {
    // 回退到 playwright
    const playwright = await import('playwright-core')
    chromiumModule = playwright.chromium
    console.log('[browser] Using playwright-core (fallback)')
  }

  return chromiumModule
}

export interface LaunchConfig {
  profileDir: string
  headed?: boolean
  slowMo?: number
}

export async function launchBrowser(config: LaunchConfig): Promise<BrowserContext> {
  const chromium = await getChromium()

  const context = await chromium.launchPersistentContext(config.profileDir, {
    channel: 'chrome',
    headless: false, // 始终有头模式，用户需要看到浏览器操作
    viewport: { width: 1280, height: 800 },
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
    slowMo: config.slowMo ?? 0,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
      '--disable-dev-shm-usage'
    ],
    ignoreDefaultArgs: ['--enable-automation']
  })

  return context
}

export async function closeBrowser(context: BrowserContext): Promise<void> {
  try {
    await context.close()
  } catch {
    // 静默处理关闭错误
  }
}
