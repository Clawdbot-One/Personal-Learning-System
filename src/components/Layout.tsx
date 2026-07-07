/**
 * LearnFlow 主布局 —— 侧边导航 + 顶栏 + 内容区
 */
import { type ReactNode, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Target, Timer, Network, Trophy, Bot, BookOpen,
  LogOut, Menu, X, Zap, Flame, ChevronRight,
} from 'lucide-react'
import { useAuthStore, useToastStore } from '@/store/auth'

const NAV_ITEMS = [
  { path: '/dashboard', label: '学习仪表盘', icon: LayoutDashboard, desc: '今日概览' },
  { path: '/plans', label: '学习计划', icon: Target, desc: '目标追踪' },
  { path: '/deep-work', label: '深度工作', icon: Timer, desc: '专注训练' },
  { path: '/knowledge', label: '知识图谱', icon: Network, desc: '知识网络' },
  { path: '/rewards', label: '奖励中心', icon: Trophy, desc: '成就排行' },
  { path: '/agent', label: 'AI 导师', icon: Bot, desc: '智能辅导' },
  { path: '/reader', label: '阅读工作台', icon: BookOpen, desc: '海绵阅读' },
]

const TOAST_STYLES: Record<string, string> = {
  success: 'bg-emerald-600',
  info: 'bg-brand-600',
  reward: 'bg-gradient-to-r from-gold-500 to-gold-600',
  error: 'bg-red-500',
}

function ToastContainer() {
  const { toasts, remove } = useToastStore()
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => remove(t.id)}
          className={`${TOAST_STYLES[t.type]} text-white px-4 py-3 rounded-xl shadow-lg cursor-pointer animate-slide-up flex items-center gap-2 min-w-[240px] max-w-sm`}
        >
          {t.type === 'reward' && <Zap size={18} />}
          <span className="text-sm font-medium">{t.message}</span>
        </div>
      ))}
    </div>
  )
}

export default function Layout({ children }: { children: ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const activeItem = NAV_ITEMS.find((item) => location.pathname.startsWith(item.path))

  return (
    <div className="min-h-screen bg-ink-50 flex">
      {/* 侧边导航 - 桌面 */}
      <aside className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-ink-200 flex flex-col z-40 transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-2.5 px-5 border-b border-ink-200">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center shadow-sm">
            <Zap size={18} className="text-white" fill="white" />
          </div>
          <div>
            <div className="font-bold text-ink-900 leading-tight">LearnFlow</div>
            <div className="text-[10px] text-ink-400 leading-tight">AI 学习辅助系统</div>
          </div>
        </div>

        {/* 导航菜单 */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = location.pathname.startsWith(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900'
                }`}
              >
                <item.icon size={18} className={active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600'} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium leading-tight">{item.label}</div>
                  <div className={`text-[10px] leading-tight ${active ? 'text-brand-400' : 'text-ink-400'}`}>{item.desc}</div>
                </div>
                {active && <ChevronRight size={14} className="text-brand-400" />}
              </Link>
            )
          })}
        </nav>

        {/* 用户信息 */}
        <div className="p-3 border-t border-ink-200">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-ink-100 transition-colors">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink-900 truncate">{user?.username}</div>
              <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                <span className="inline-flex items-center gap-0.5 text-gold-600">
                  <Trophy size={10} /> Lv.{user?.level}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-0.5">
                  <Flame size={10} className="text-orange-500" /> {user?.streak_days}天
                </span>
              </div>
            </div>
            <button onClick={handleLogout} className="lf-btn-ghost !p-1.5" title="退出登录">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* 移动端遮罩 */}
      {mobileOpen && <div className="fixed inset-0 bg-ink-950/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      {/* 主内容区 */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* 顶栏 */}
        <header className="h-16 bg-white/80 backdrop-blur border-b border-ink-200 sticky top-0 z-20 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden lf-btn-ghost !p-2" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div>
              <h2 className="text-base font-semibold text-ink-900">{activeItem?.label ?? 'LearnFlow'}</h2>
              <p className="text-xs text-ink-400 hidden sm:block">{activeItem?.desc ?? 'AI 驱动的个人学习辅助系统'}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-50 border border-gold-200">
              <Zap size={14} className="text-gold-600" />
              <span className="text-sm font-semibold text-gold-700">{user?.points ?? 0}</span>
              <span className="text-xs text-gold-500">积分</span>
            </div>
            <Link to="/agent" className="lf-btn-primary !py-1.5 !px-3 text-sm">
              <Bot size={16} />
              <span className="hidden sm:inline">问导师</span>
            </Link>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
      </div>

      <ToastContainer />
    </div>
  )
}
