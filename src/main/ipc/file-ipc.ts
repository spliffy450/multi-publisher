import { ipcMain, dialog } from 'electron'

export function registerFileIPC(): void {
  ipcMain.handle('file:selectVideo', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择视频文件',
      filters: [
        { name: '视频文件', extensions: ['mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('file:selectImage', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择图片文件',
      filters: [
        { name: '图片文件', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
      ],
      properties: ['openFile']
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })
}
