export type PlatformType =
  | 'bilibili'
  | 'douyin'
  | 'xiaohongshu'
  | 'kuaishou'
  | 'weixin-video'
  | 'toutiao'
  | 'youtube'
  | 'weibo'
  | 'zhihu'

export interface PublishOptions {
  title: string
  description: string
  tags: string[]
  videoPath: string
  coverPath?: string
  coverVerticalPath?: string
  scheduledTime?: string
}

export interface PublishResult {
  success: boolean
  url?: string
  error?: string
  duration?: number
}

export type ProgressCallback = (
  status: string,
  message?: string,
  percent?: number
) => void

export interface PlatformAdapter {
  name: PlatformType
  loginUrl: string
  uploadUrl: string
  checkLogin(page: import('playwright-core').Page): Promise<boolean>
  publish(
    page: import('playwright-core').Page,
    options: PublishOptions,
    onProgress: ProgressCallback
  ): Promise<PublishResult>
}

// Main → Worker 消息
export type WorkerCommand =
  | {
      type: 'publish'
      taskId: number
      platform: PlatformType
      accountId: number
      profileDir: string
      options: PublishOptions
    }
  | {
      type: 'login'
      platform: PlatformType
      profileDir: string
      loginUrl: string
    }
  | {
      type: 'checkLogin'
      platform: PlatformType
      profileDir: string
    }
  | { type: 'cancel' }

// Worker → Main 消息
export type WorkerEvent =
  | {
      type: 'progress'
      taskId: number
      platform: PlatformType
      accountId: number
      status: string
      message?: string
      percent?: number
    }
  | {
      type: 'result'
      taskId: number
      platform: PlatformType
      accountId: number
      success: boolean
      url?: string
      error?: string
    }
  | {
      type: 'loginStatus'
      platform: PlatformType
      profileDir: string
      loggedIn: boolean
    }
  | {
      type: 'loginClosed'
      platform: PlatformType
      profileDir: string
    }
