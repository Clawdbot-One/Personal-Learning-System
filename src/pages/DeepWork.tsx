/** 深度工作页 —— 专注保护 · 时间块规划 · 心流状态（融合《深度工作》方法论） */
import { useState, useRef, useEffect, useCallback } from 'react'
import { Timer, Play, Pause, Square, Coffee, Brain, Zap, TrendingUp, Clock, Sparkles } from 'lucide-react'
import { PageHeader, Card, StatCard, EmptyState, EngineTag, Skeleton } from '@/components/ui'
import { sessionsApi } from '@/lib/api'
import { useAuthStore, toast } from '@/store/auth'
import type { LearningSession } from '@/lib/types'

type ModeKey = 'pomodoro' | 'deep' | 'shortBreak' | 'longBreak'

const MODES: { key: ModeKey; label: string; minutes: number; focus: boolean }[] = [
  { key: 'pomodoro', label: '番茄钟', minutes: 25, focus: true },
  { key: 'deep', label: '深度专注', minutes: 50, focus: true },
  { key: 'shortBreak', label: '短休息', minutes: 5, focus: false },
  { key: 'longBreak', label: '长休息', minutes: 15, focus: false },
]

const TIPS = [
  { icon: Zap, title: '关闭所有通知', desc: '手机静音、关闭邮件与即时消息，为深度专注筑起护城河，避免注意力被碎片化。' },
  { icon: Sparkles, title: '固定启动仪式', desc: '每次深度工作前重复相同的仪式（如整理桌面、冲一杯咖啡），向大脑发送"进入心流"的信号。' },
  { icon: Coffee, title: '拥抱无聊', desc: '排队、通勤时主动抵抗刷手机的冲动，训练专注力肌肉，让大脑习惯持续集中。' },
]

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60)
  return `${String(m).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export default function DeepWork() {
  const { user, refreshUser } = useAuthStore()
  const [mode, setMode] = useState<ModeKey>('pomodoro')
  const [secondsLeft, setSecondsLeft] = useState(MODES[0].minutes * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessions, setSessions] = useState<LearningSession[] | null>(null)
  const [stats, setStats] = useState<{ todayFocus: number; todaySessions: number; avgPerf: number } | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const currentMode = MODES.find((m) => m.key === mode)!

  const loadAll = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([sessionsApi.list('deep_work'), sessionsApi.stats(1)])
      setSessions(list)
      const deep = s.by_engine?.find((e) => e.engine_type === 'deep_work')
      setStats({
        todayFocus: deep?.focus ?? 0,
        todaySessions: deep?.count ?? 0,
        avgPerf: deep?.avg_perf ?? s.totals?.avg_perf ?? 0,
      })
    } catch {
      setSessions([])
    }
  }, [])

  const submitSession = useCallback(
    async (focusMinutes: number, title: string) => {
      setSubmitting(true)
      try {
        const { reward } = await sessionsApi.create({
          engine_type: 'deep_work',
          title,
          focus_minutes: focusMinutes,
          duration_minutes: focusMinutes,
        })
        if (reward) {
          toast(`深度工作完成！获得 ${reward.total} 积分${reward.bonus ? `（含 ${reward.bonus} 加成）` : ''}`, 'reward')
        } else {
          toast('深度工作会话已记录', 'success')
        }
        refreshUser()
        loadAll()
      } catch (e) {
        toast((e as Error).message, 'error')
      } finally {
        setSubmitting(false)
      }
    },
    [refreshUser, loadAll],
  )

  // 计时主循环：每 1000ms 减 1，到 0 自动停止
  useEffect(() => {
    if (!isRunning) return
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1))
    }, 1000)
    intervalRef.current = id
    return () => {
      clearInterval(id)
      intervalRef.current = null
    }
  }, [isRunning])

  // 归零完成处理：专注模式提交会话，休息模式仅提示
  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return
    setIsRunning(false)
    const m = currentMode
    if (m.focus) {
      submitSession(m.minutes, `${m.label} · ${new Date().toLocaleDateString('zh-CN')}`)
    } else {
      toast(`${m.label}结束，准备好下一轮专注了吗？`, 'info')
    }
    setSecondsLeft(m.minutes * 60)
  }, [secondsLeft, isRunning, currentMode, submitSession])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const switchMode = (key: ModeKey) => {
    if (isRunning || submitting) return
    setMode(key)
    setSecondsLeft(MODES.find((m) => m.key === key)!.minutes * 60)
  }

  const handlePause = () => {
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const handleStop = () => {
    const full = currentMode.minutes * 60
    const elapsed = full - secondsLeft
    setIsRunning(false)
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (currentMode.focus && secondsLeft > 0 && elapsed >= 60) {
      const focusMin = Math.round(elapsed / 60)
      if (window.confirm(`已专注 ${focusMin} 分钟，是否记录本次会话？`)) {
        submitSession(focusMin, `${currentMode.label}（中断）· ${new Date().toLocaleDateString('zh-CN')}`)
      }
    }
    setSecondsLeft(full)
  }

  const fullSeconds = currentMode.minutes * 60
  const progress = Math.round(((fullSeconds - secondsLeft) / fullSeconds) * 100)
  const gradient = isRunning
    ? currentMode.focus
      ? 'bg-gradient-to-br from-emerald-500 via-emerald-600 to-brand-700'
      : 'bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600'
    : 'bg-gradient-to-br from-ink-50 to-white'

  return (
    <div className="space-y-6">
      <PageHeader title="深度工作" subtitle="专注保护 · 时间块规划 · 心流状态" />

      {/* 核心计时器 */}
      <Card hover={false} className="overflow-hidden !p-0">
        <div className={`relative ${gradient} transition-all duration-500`}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 20%, white 0%, transparent 50%)' }} />
          <div className="relative p-8 md:p-10">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Timer size={18} className={isRunning ? 'text-white' : 'text-ink-400'} />
              <span className={`text-sm font-medium ${isRunning ? 'text-white/90' : 'text-ink-500'}`}>
                {isRunning ? `${currentMode.label}进行中` : `当前模式：${currentMode.label}`}
              </span>
            </div>
            <div className={`text-center font-mono text-7xl md:text-8xl font-bold tabular-nums ${isRunning ? 'text-white' : 'text-ink-900'}`}>
              {fmt(secondsLeft)}
            </div>
            <div className="mt-6 mx-auto max-w-md">
              <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/80 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {/* 模式选择 */}
            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-2 max-w-2xl mx-auto">
              {MODES.map((m) => {
                const active = mode === m.key
                const cls = active
                  ? 'bg-white text-ink-900 shadow-md'
                  : isRunning
                    ? 'bg-white/10 text-white/70'
                    : 'bg-white/70 text-ink-600 hover:bg-white'
                return (
                  <button key={m.key} onClick={() => switchMode(m.key)} disabled={isRunning || submitting} className={`lf-btn !py-2 text-sm ${cls}`}>
                    {m.label}
                    <span className="text-xs opacity-70">{m.minutes}分</span>
                  </button>
                )
              })}
            </div>
            {/* 控制按钮 */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {!isRunning ? (
                <button onClick={() => setIsRunning(true)} disabled={submitting || secondsLeft === 0} className="lf-btn-primary !px-6 !py-2.5">
                  <Play size={18} /> 开始专注
                </button>
              ) : (
                <button onClick={handlePause} className="lf-btn-secondary !px-6 !py-2.5">
                  <Pause size={18} /> 暂停
                </button>
              )}
              <button onClick={handleStop} disabled={!isRunning && secondsLeft === fullSeconds} className="lf-btn-ghost !px-6 !py-2.5">
                <Square size={18} /> 停止
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* 今日统计 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats ? (
          <>
            <StatCard icon={Clock} label="今日专注" value={`${stats.todayFocus}`} sub="分钟" color="brand" />
            <StatCard icon={Timer} label="今日会话" value={stats.todaySessions} sub="次深度工作" color="green" />
            <StatCard icon={Brain} label="累计专注" value={`${((user?.total_focus_minutes ?? 0) / 60).toFixed(1)}h`} sub="小时" color="gold" />
            <StatCard icon={TrendingUp} label="平均表现" value={stats.avgPerf.toFixed(1)} sub="深度工作均分" color="purple" />
          </>
        ) : (
          <>
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 近期会话记录 */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink-900">近期深度工作记录</h3>
            <EngineTag engine="deep_work" />
          </div>
          {sessions === null ? (
            <div className="space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState icon={Timer} title="还没有深度工作记录" description="开始你的第一次专注，进入心流状态。" />
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 8).map((s) => {
                const cols = [
                  { v: `${s.focus_minutes}分`, l: '时长', c: 'text-ink-900' },
                  { v: s.difficulty, l: '难度', c: 'text-ink-900' },
                  { v: s.performance_score, l: '表现', c: 'text-emerald-600' },
                ]
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-ink-50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Brain size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-ink-900 truncate">{s.title || '深度工作会话'}</div>
                      <div className="text-xs text-ink-400 mt-0.5">
                        {new Date(s.started_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs flex-shrink-0">
                      {cols.map((c) => (
                        <div key={c.l} className="text-center">
                          <div className={`font-semibold ${c.c}`}>{c.v}</div>
                          <div className="text-ink-400">{c.l}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* 深度工作小贴士 */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-gold-500" />
            <h3 className="font-semibold text-ink-900">深度工作小贴士</h3>
          </div>
          <div className="space-y-4">
            {TIPS.map((t) => (
              <div key={t.title} className="flex gap-3">
                <div className="w-9 h-9 rounded-lg bg-gold-50 text-gold-600 flex items-center justify-center flex-shrink-0">
                  <t.icon size={16} />
                </div>
                <div>
                  <div className="text-sm font-medium text-ink-900">{t.title}</div>
                  <div className="text-xs text-ink-500 leading-relaxed mt-0.5">{t.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
