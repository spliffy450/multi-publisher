import { useState, useEffect } from 'react'

const PLATFORM_LABELS: Record<string, string> = {
  bilibili: 'B站',
  douyin: '抖音',
  xiaohongshu: '小红书',
  kuaishou: '快手'
}

interface ProgressItem {
  platform: string
  accountId: number
  status: string
  message?: string
  percent?: number
  error?: string
  resultUrl?: string
}

export default function PublishPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [videoPath, setVideoPath] = useState('')
  const [coverPath, setCoverPath] = useState('')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccounts, setSelectedAccounts] = useState<{ platform: string; accountId: number }[]>([])
  const [publishing, setPublishing] = useState(false)
  const [progressList, setProgressList] = useState<ProgressItem[]>([])

  useEffect(() => {
    window.api.getAccounts().then(setAccounts)
  }, [])

  useEffect(() => {
    if (!publishing) return
    const cleanup = window.api.onPublishProgress((progress) => {
      setProgressList(prev => {
        const key = `${progress.platform}_${progress.accountId}`
        const exists = prev.find(p => `${p.platform}_${p.accountId}` === key)
        if (exists) {
          return prev.map(p =>
            `${p.platform}_${p.accountId}` === key ? { ...p, ...progress } : p
          )
        }
        return [...prev, progress]
      })
    })
    return cleanup
  }, [publishing])

  const handleSelectVideo = async () => {
    const path = await window.api.selectVideo()
    if (path) setVideoPath(path)
  }

  const handleSelectCover = async () => {
    const path = await window.api.selectImage()
    if (path) setCoverPath(path)
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag))
  }

  const toggleAccount = (platform: string, accountId: number) => {
    setSelectedAccounts(prev => {
      const exists = prev.find(a => a.accountId === accountId)
      if (exists) return prev.filter(a => a.accountId !== accountId)
      return [...prev, { platform, accountId }]
    })
  }

  const handlePublish = async () => {
    if (!videoPath || !title || selectedAccounts.length === 0) return
    setPublishing(true)
    setProgressList([])
    try {
      await window.api.startPublish({
        title,
        description,
        tags,
        videoPath,
        coverPath: coverPath || undefined,
        platforms: selectedAccounts
      })
    } catch (err) {
      console.error('Publish failed:', err)
    }
  }

  const handleCloseProgress = () => {
    setPublishing(false)
    setProgressList([])
  }

  const allDone = progressList.length > 0 &&
    progressList.every(p => p.status === 'success' || p.status === 'failed')

  const accountsByPlatform = accounts.reduce((acc, account) => {
    if (!acc[account.platform]) acc[account.platform] = []
    acc[account.platform].push(account)
    return acc
  }, {} as Record<string, Account[]>)

  const canPublish = videoPath && title && selectedAccounts.length > 0 && !publishing

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">发布内容</h1>

      {/* 视频文件 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">视频文件 *</label>
        <div
          onClick={handleSelectVideo}
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
        >
          {videoPath ? (
            <div>
              <div className="text-blue-600 font-medium">已选择视频</div>
              <div className="text-sm text-gray-500 mt-1 truncate max-w-md mx-auto">{videoPath}</div>
            </div>
          ) : (
            <div>
              <div className="text-gray-400 text-3xl mb-2">+</div>
              <div className="text-gray-500">点击选择视频文件</div>
              <div className="text-xs text-gray-400 mt-1">支持 mp4, avi, mov, mkv, flv</div>
            </div>
          )}
        </div>
      </div>

      {/* 标题 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          placeholder="输入视频标题"
          maxLength={80}
        />
        <div className="text-xs text-gray-400 mt-1 text-right">{title.length}/80</div>
      </div>

      {/* 描述 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
          placeholder="输入视频描述"
          rows={4}
        />
      </div>

      {/* 标签 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
        {tags.length > 0 && (
          <div className="flex gap-2 mb-2 flex-wrap">
            {tags.map(tag => (
              <span key={tag} className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm flex items-center gap-1">
                #{tag}
                <button onClick={() => handleRemoveTag(tag)} className="text-blue-400 hover:text-blue-600 ml-0.5">x</button>
              </span>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleAddTag()
              }
            }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            placeholder="输入标签后回车添加"
          />
          <button
            onClick={handleAddTag}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors"
          >
            添加
          </button>
        </div>
      </div>

      {/* 封面 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">封面图（可选）</label>
        <button
          onClick={handleSelectCover}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {coverPath ? `已选择: ${coverPath.split(/[/\\]/).pop()}` : '选择封面图片'}
        </button>
        {coverPath && (
          <button
            onClick={() => setCoverPath('')}
            className="ml-2 text-sm text-red-500 hover:text-red-600"
          >
            清除
          </button>
        )}
      </div>

      {/* 发布平台 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">发布平台 *</label>
        {Object.keys(accountsByPlatform).length === 0 ? (
          <div className="text-gray-400 text-sm border border-dashed border-gray-200 rounded-lg p-4 text-center">
            暂无账号，请先在「账号」页面添加
          </div>
        ) : (
          <div className="space-y-2">
            {Object.entries(accountsByPlatform).map(([platform, accs]) => (
              <div key={platform} className="border border-gray-200 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-700 mb-2">
                  {PLATFORM_LABELS[platform] || platform}
                </div>
                <div className="space-y-1">
                  {accs.map(acc => (
                    <label key={acc.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedAccounts.some(a => a.accountId === acc.id)}
                        onChange={() => toggleAccount(platform, acc.id)}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{acc.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        acc.is_logged_in ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {acc.is_logged_in ? '已登录' : '未登录'}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 发布按钮 */}
      <button
        onClick={handlePublish}
        disabled={!canPublish}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {publishing ? '发布中...' : selectedAccounts.length > 0
          ? `发布到 ${selectedAccounts.length} 个账号`
          : '请选择发布平台'}
      </button>

      {/* 发布进度弹窗 */}
      {publishing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[480px] max-h-[80vh] overflow-y-auto shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">发布进度</h2>
            <div className="space-y-3">
              {progressList.map((item) => {
                const acc = accounts.find(a => a.id === item.accountId)
                return (
                  <div key={`${item.platform}_${item.accountId}`} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {PLATFORM_LABELS[item.platform] || item.platform}
                        {acc ? ` - ${acc.name}` : ''}
                      </span>
                      <StatusBadge status={item.status} />
                    </div>
                    {item.message && (
                      <div className="text-xs text-gray-500">{item.message}</div>
                    )}
                    {item.percent != null && item.status !== 'success' && item.status !== 'failed' && (
                      <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    )}
                    {item.error && (
                      <div className="text-xs text-red-500 mt-1">{item.error}</div>
                    )}
                    {item.resultUrl && (
                      <div className="text-xs text-green-600 mt-1 truncate">{item.resultUrl}</div>
                    )}
                  </div>
                )
              })}

              {progressList.length === 0 && (
                <div className="text-center text-gray-400 py-4">等待 Worker 启动...</div>
              )}
            </div>

            {allDone && (
              <button
                onClick={handleCloseProgress}
                className="mt-4 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors"
              >
                关闭
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    waiting:    { bg: 'bg-gray-100 text-gray-600', label: '等待中' },
    launching:  { bg: 'bg-yellow-100 text-yellow-700', label: '启动中' },
    uploading:  { bg: 'bg-blue-100 text-blue-700', label: '上传中' },
    filling:    { bg: 'bg-blue-100 text-blue-700', label: '填写中' },
    publishing: { bg: 'bg-purple-100 text-purple-700', label: '发布中' },
    success:    { bg: 'bg-green-100 text-green-700', label: '成功' },
    failed:     { bg: 'bg-red-100 text-red-600', label: '失败' },
  }
  const c = config[status] || { bg: 'bg-gray-100 text-gray-600', label: status }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg}`}>{c.label}</span>
  )
}
