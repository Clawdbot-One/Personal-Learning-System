/**
 * 登录/注册页 —— LearnFlow 入口
 */
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, BookOpen, Target, Brain, ArrowRight, Loader2 } from 'lucide-react'
import { useAuthStore, toast } from '@/store/auth'

const FEATURES = [
  { icon: Target, title: '刻意练习', desc: '技能分解 · 自适应难度 · 即时反馈', color: '#7c3aed' },
  { icon: BookOpen, title: '海绵阅读', desc: '三层笔记 · 阅读能力诊断', color: '#db2777' },
  { icon: Brain, title: '深度工作', desc: '专注保护 · 时间块规划', color: '#059669' },
  { icon: Zap, title: '跨学科奖励', desc: '心理学 · 社会学 · 金融学融合', color: '#f59e0b' },
]

export default function Login() {
  const navigate = useNavigate()
  const { login, register, loading } = useAuthStore()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [account, setAccount] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    try {
      if (mode === 'login') {
        await login(account, password)
        toast('欢迎回来！', 'success')
      } else {
        await register(username, email, password)
        toast('注册成功，开启你的学习之旅！', 'success')
      }
      navigate('/dashboard')
    } catch (err) {
      toast((err as Error).message, 'error')
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* 左侧品牌展示 */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-ink-900 via-brand-900 to-brand-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(245,158,11,0.4) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(37,99,235,0.4) 0%, transparent 40%)' }} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
                <Zap size={22} className="text-gold-400" fill="currentColor" />
              </div>
              <span className="text-2xl font-bold">LearnFlow</span>
            </div>
            <p className="text-white/60 text-sm">AI 驱动的个人学习辅助系统</p>
          </div>

          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold leading-tight mb-3">
                融合五大经典<br />学习方法论
              </h1>
              <p className="text-white/70 leading-relaxed max-w-md">
                将《刻意练习》《海绵阅读法》《深度工作》《知行差距》《学会提问》转化为可操作的功能，
                通过多 Agent 协同与跨学科奖励机制，让学习更高效、更持久、更有深度。
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {FEATURES.map((f) => (
                <div key={f.title} className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                  <f.icon size={22} style={{ color: f.color }} />
                  <div className="text-sm font-semibold mt-2">{f.title}</div>
                  <div className="text-xs text-white/50 mt-0.5">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-xs text-white/40">
            © 2026 LearnFlow · 商业化级全栈学习平台
          </div>
        </div>
      </div>

      {/* 右侧表单 */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-ink-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
              <Zap size={20} className="text-white" fill="white" />
            </div>
            <span className="text-xl font-bold text-ink-900">LearnFlow</span>
          </div>

          <h2 className="text-2xl font-bold text-ink-900 mb-1">
            {mode === 'login' ? '欢迎回来' : '创建账户'}
          </h2>
          <p className="text-sm text-ink-500 mb-6">
            {mode === 'login' ? '登录继续你的学习之旅' : '注册开启系统化学习方法'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">用户名</label>
                  <input className="lf-input" placeholder="请输入用户名" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">邮箱</label>
                  <input type="email" className="lf-input" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
              </>
            )}

            {mode === 'login' && (
              <div>
                <label className="block text-sm font-medium text-ink-700 mb-1.5">账号</label>
                <input className="lf-input" placeholder="用户名或邮箱" value={account} onChange={(e) => setAccount(e.target.value)} required />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">密码</label>
              <input type="password" className="lf-input" placeholder={mode === 'register' ? '至少6位' : '请输入密码'} value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>

            <button type="submit" disabled={loading} className="lf-btn-primary w-full !py-2.5">
              {loading ? <Loader2 size={18} className="animate-spin" /> : <>{mode === 'login' ? '登录' : '注册'} <ArrowRight size={18} /></>}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-ink-500">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="text-brand-600 font-medium hover:underline ml-1">
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
