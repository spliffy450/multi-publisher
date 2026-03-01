/// <reference types="vite/client" />

interface PublishTaskInput {
  title: string
  description: string
  tags: string[]
  videoPath: string
  coverPath?: string
  coverVerticalPath?: string
  scheduledTime?: string
  platforms: { platform: string; accountId: number }[]
}

interface PublishProgress {
  platform: string
  accountId: number
  status: 'waiting' | 'launching' | 'uploading' | 'filling' | 'publishing' | 'success' | 'failed'
  message?: string
  resultUrl?: string
  error?: string
  percent?: number
}

interface Account {
  id: number
  platform: string
  name: string
  profile_dir: string
  is_logged_in: number
  last_login_check: string | null
  created_at: string
}

interface PublishLog {
  id: number
  task_id: number
  platform: string
  account_id: number
  status: string
  result_url: string | null
  error: string | null
  duration_ms: number | null
  started_at: string | null
  finished_at: string | null
  task_title?: string
}

interface Window {
  api: {
    getAccounts: () => Promise<Account[]>
    addAccount: (platform: string, name: string) => Promise<Account>
    removeAccount: (id: number) => Promise<{ success: boolean }>
    openLoginBrowser: (accountId: number) => Promise<{ success: boolean }>
    checkLogin: (accountId: number) => Promise<{ loggedIn: boolean }>
    onAccountStatusUpdate: (callback: (data: { accountId: number; loggedIn: boolean }) => void) => () => void
    startPublish: (task: PublishTaskInput) => Promise<{ taskId: number }>
    cancelPublish: () => Promise<{ success: boolean }>
    onPublishProgress: (callback: (progress: PublishProgress) => void) => () => void
    getHistory: (limit?: number, offset?: number) => Promise<PublishLog[]>
    selectVideo: () => Promise<string | null>
    selectImage: () => Promise<string | null>
  }
}
