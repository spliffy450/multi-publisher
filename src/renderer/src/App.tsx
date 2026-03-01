import { useState } from 'react'
import PublishPage from './pages/PublishPage'
import AccountsPage from './pages/AccountsPage'
import HistoryPage from './pages/HistoryPage'

type Page = 'publish' | 'accounts' | 'history'

const NAV_ITEMS: { key: Page; label: string; icon: string }[] = [
  { key: 'publish', label: '发布', icon: '📤' },
  { key: 'accounts', label: '账号', icon: '👤' },
  { key: 'history', label: '记录', icon: '📋' },
]

export default function App() {
  const [page, setPage] = useState<Page>('publish')

  return (
    <div className="flex h-screen bg-gray-50">
      {/* 侧边栏 */}
      <nav className="w-20 bg-gray-900 flex flex-col items-center py-6 gap-2 shrink-0">
        <div className="text-lg font-bold text-white mb-6">MP</div>
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-colors ${
              page === item.key
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            }`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="text-[10px]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* 主内容 */}
      <main className="flex-1 overflow-y-auto">
        {page === 'publish' && <PublishPage />}
        {page === 'accounts' && <AccountsPage />}
        {page === 'history' && <HistoryPage />}
      </main>
    </div>
  )
}
