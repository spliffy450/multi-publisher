import { useState, useEffect } from 'react'

const PLATFORM_LABELS: Record<string, string> = {
  bilibili: 'B站',
  douyin: '抖音',
  xiaohongshu: '小红书',
  kuaishou: '快手'
}

export default function HistoryPage() {
  const [logs, setLogs] = useState<PublishLog[]>([])
  const [loading, setLoading] = useState(true)

  const loadHistory = async () => {
    setLoading(true)
    const data = await window.api.getHistory()
    setLogs(data)
    setLoading(false)
  }

  useEffect(() => {
    loadHistory()
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">发布记录</h1>
        <button
          onClick={loadHistory}
          className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          刷新
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-center py-16">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center text-gray-400 py-16 border border-dashed border-gray-200 rounded-lg">
          暂无发布记录
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">标题</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">平台</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">状态</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-16">耗时</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 w-36">时间</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 truncate max-w-xs">
                    {log.task_title || `任务 #${log.task_id}`}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {PLATFORM_LABELS[log.platform] || log.platform}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={log.status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {log.finished_at || log.started_at || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    pending:    { bg: 'bg-gray-100 text-gray-600', label: '等待' },
    uploading:  { bg: 'bg-blue-100 text-blue-700', label: '上传' },
    publishing: { bg: 'bg-purple-100 text-purple-700', label: '发布' },
    success:    { bg: 'bg-green-100 text-green-700', label: '成功' },
    failed:     { bg: 'bg-red-100 text-red-600', label: '失败' },
  }
  const c = config[status] || { bg: 'bg-gray-100 text-gray-600', label: status }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${c.bg}`}>{c.label}</span>
  )
}
