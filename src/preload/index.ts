import { contextBridge, ipcRenderer } from 'electron'

export interface PublishTaskInput {
  title: string
  description: string
  tags: string[]
  videoPath: string
  coverPath?: string
  coverVerticalPath?: string
  scheduledTime?: string
  platforms: { platform: string; accountId: number }[]
}

export interface PublishProgress {
  platform: string
  accountId: number
  status: 'waiting' | 'launching' | 'uploading' | 'filling' | 'publishing' | 'success' | 'failed'
  message?: string
  resultUrl?: string
  error?: string
  percent?: number
}

const api = {
  // 账号管理
  getAccounts: () => ipcRenderer.invoke('account:list'),
  addAccount: (platform: string, name: string) =>
    ipcRenderer.invoke('account:add', platform, name),
  removeAccount: (id: number) => ipcRenderer.invoke('account:remove', id),
  openLoginBrowser: (accountId: number) =>
    ipcRenderer.invoke('account:login', accountId),
  checkLogin: (accountId: number) =>
    ipcRenderer.invoke('account:checkLogin', accountId),

  // 账号状态更新回调（登录完成后自动推送）
  onAccountStatusUpdate: (callback: (data: { accountId: number; loggedIn: boolean }) => void) => {
    const handler = (_e: unknown, data: { accountId: number; loggedIn: boolean }) => callback(data)
    ipcRenderer.on('account:statusUpdate', handler)
    return () => ipcRenderer.removeListener('account:statusUpdate', handler)
  },

  // 发布
  startPublish: (task: PublishTaskInput) => ipcRenderer.invoke('publish:start', task),
  cancelPublish: () => ipcRenderer.invoke('publish:cancel'),

  // 发布进度回调
  onPublishProgress: (callback: (progress: PublishProgress) => void) => {
    const handler = (_e: unknown, progress: PublishProgress) => callback(progress)
    ipcRenderer.on('publish:progress', handler)
    return () => ipcRenderer.removeListener('publish:progress', handler)
  },

  // 发布记录
  getHistory: (limit?: number, offset?: number) =>
    ipcRenderer.invoke('publish:history', limit, offset),

  // 文件选择
  selectVideo: () => ipcRenderer.invoke('file:selectVideo') as Promise<string | null>,
  selectImage: () => ipcRenderer.invoke('file:selectImage') as Promise<string | null>,
}

contextBridge.exposeInMainWorld('api', api)

export type ElectronAPI = typeof api
