import { useState, useEffect, useCallback } from 'react'

const PLATFORMS = [
  { key: 'bilibili', label: 'B站' },
  { key: 'douyin', label: '抖音' },
  { key: 'xiaohongshu', label: '小红书' },
  { key: 'kuaishou', label: '快手' }
]

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlatform, setNewPlatform] = useState('bilibili')
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState<Record<number, string>>({})

  const loadAccounts = useCallback(async () => {
    const list = await window.api.getAccounts()
    setAccounts(list)
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  // 监听登录状态自动更新
  useEffect(() => {
    const cleanup = window.api.onAccountStatusUpdate((data) => {
      setAccounts(prev => prev.map(a =>
        a.id === data.accountId
          ? { ...a, is_logged_in: data.loggedIn ? 1 : 0 }
          : a
      ))
      setLoading(prev => {
        const { [data.accountId]: _, ...rest } = prev
        return rest
      })
    })
    return cleanup
  }, [])

  const handleAdd = async () => {
    if (!newName.trim()) return
    await window.api.addAccount(newPlatform, newName.trim())
    setNewName('')
    setShowAddForm(false)
    loadAccounts()
  }

  const handleRemove = async (id: number) => {
    if (!confirm('确定删除此账号？相关的浏览器数据也会被清除。')) return
    await window.api.removeAccount(id)
    loadAccounts()
  }

  const handleLogin = async (id: number) => {
    setLoading(prev => ({ ...prev, [id]: '浏览器已打开，请登录后关闭...' }))
    await window.api.openLoginBrowser(id)
  }

  const handleCheckLogin = async (id: number) => {
    setLoading(prev => ({ ...prev, [id]: '检查登录状态...' }))
    const result = await window.api.checkLogin(id)
    setAccounts(prev => prev.map(a =>
      a.id === id ? { ...a, is_logged_in: result.loggedIn ? 1 : 0 } : a
    ))
    setLoading(prev => {
      const { [id]: _, ...rest } = prev
      return rest
    })
  }

  const accountsByPlatform = PLATFORMS.map(p => ({
    ...p,
    accounts: accounts.filter(a => a.platform === p.key)
  }))

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">账号管理</h1>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
        >
          添加账号
        </button>
      </div>

      {/* 添加表单 */}
      {showAddForm && (
        <div className="border border-blue-200 bg-blue-50/50 rounded-lg p-4 mb-6">
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">平台</label>
              <select
                value={newPlatform}
                onChange={e => setNewPlatform(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PLATFORMS.map(p => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="给账号起个名字"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              确定
            </button>
            <button
              onClick={() => { setShowAddForm(false); setNewName('') }}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 账号列表（按平台分组） */}
      {accountsByPlatform.map(group => (
        <div key={group.key} className="mb-6">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            {group.label}
          </h2>
          {group.accounts.length === 0 ? (
            <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
              暂无{group.label}账号
            </div>
          ) : (
            <div className="space-y-2">
              {group.accounts.map(acc => (
                <div
                  key={acc.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${acc.is_logged_in ? 'bg-green-500' : 'bg-red-400'}`} />
                    <div>
                      <div className="font-medium text-gray-900">{acc.name}</div>
                      <div className="text-xs text-gray-400">
                        {acc.is_logged_in ? '已登录' : '未登录'}
                        {acc.last_login_check && ` · ${acc.last_login_check}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loading[acc.id] ? (
                      <span className="text-sm text-gray-500 animate-pulse">{loading[acc.id]}</span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleLogin(acc.id)}
                          className="text-sm text-blue-600 hover:text-blue-700 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                          登录
                        </button>
                        <button
                          onClick={() => handleCheckLogin(acc.id)}
                          className="text-sm text-gray-600 hover:text-gray-700 px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          检查
                        </button>
                        <button
                          onClick={() => handleRemove(acc.id)}
                          className="text-sm text-red-500 hover:text-red-600 px-3 py-1.5 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 使用说明 */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4 text-sm text-gray-500 space-y-1">
        <div className="font-medium text-gray-600 mb-2">使用说明</div>
        <div>1. 点击「添加账号」选择平台并命名</div>
        <div>2. 点击「登录」会打开对应平台的浏览器窗口</div>
        <div>3. 在浏览器中手动完成登录，登录后关闭浏览器</div>
        <div>4. 关闭浏览器后会自动检查登录状态</div>
      </div>
    </div>
  )
}
