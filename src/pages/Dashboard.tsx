/**
 * LearnFlow 学习仪表盘 —— 用户登录后的主页
 * 汇总今日数据、近7天专注趋势、引擎使用分布、活跃计划与 AI 导师入口
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Timer, ListChecks, Clock, Network, Flame, Trophy, Bot, ArrowRight,
  Calendar, Sparkles, TrendingUp, Award, Target, Inbox,
} from 'lucide-react'
import { Card, StatCard, ProgressBar, EmptyState, Skeleton } from '@/components/ui'
import { analyticsApi } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { ENGINE_LABELS, ENGINE_COLORS, type DashboardData } from '@/lib/types'

/** 近7天专注趋势柱状图（纯 SVG，悬停显示数值） */
function WeeklyFocusChart({ data }: { data: DashboardData['weekly_focus'] }) {
  const [hover, setHover] = useState<number | null>(null)
  const maxFocus = Math.max(1, ...data.map((d) => d.focus))
  const W = 720, H = 240, padX = 24, padTop = 30, padBottom = 34
  const innerW = W - padX * 2
  const chartH = H - padTop - padBottom
  const slot = data.length ? innerW / data.length : innerW
  const barW = Math.min(48, slot * 0.6)

  const fmtDay = (d: string) => {
    const dt = new Date(d)
    return isNaN(dt.getTime()) ? '' : `${dt.getMonth() + 1}/${dt.getDate()}`
  }

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        <line x1={padX} y1={padTop + chartH} x2={W - padX} y2={padTop + chartH} stroke="#e2e5ea" strokeWidth={1} />
        {data.map((d, i) => {
          const h = (d.focus / maxFocus) * chartH
          const cx = padX + slot * i + slot / 2
          const x = cx - barW / 2
          const y = padTop + chartH - h
          const active = hover === i
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={padX + slot * i} y={padTop} width={slot} height={chartH} fill="transparent" />
              <rect
                x={x} y={y} width={barW} height={Math.max(2, h)} rx={6}
                fill={active ? '#2563eb' : '#93b4fd'}
                className="transition-all duration-200"
              />
              {active && (
                <g>
                  <rect x={cx - 32} y={Math.max(2, y - 28)} width={64} height={20} rx={6} fill="#1a1f36" />
                  <text x={cx} y={Math.max(2, y - 28) + 14} textAnchor="middle" fill="#fff" fontSize={11} fontWeight={600}>
                    {d.focus}分钟
                  </text>
                </g>
              )}
              <text x={cx} y={H - 12} textAnchor="middle" fill="#9aa3b2" fontSize={11}>
                {fmtDay(d.date)}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

/** 五大引擎使用分布（横向进度条，按专注时长占比） */
function EngineDistribution({ data }: { data: DashboardData['engine_distribution'] }) {
  const total = data.reduce((s, d) => s + d.focus, 0) || 1
  const sorted = [...data].sort((a, b) => b.focus - a.focus)
  return (
    <div className="space-y-4">
      {sorted.map((d) => {
        const color = ENGINE_COLORS[d.engine_type] || '#6b7280'
        const label = ENGINE_LABELS[d.engine_type] || d.engine_type
        const pct = Math.round((d.focus / total) * 100)
        return (
          <div key={d.engine_type}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <span className="text-sm font-medium text-ink-700">{label}</span>
              </div>
              <span className="text-xs text-ink-500">{d.focus}分钟 · {pct}%</span>
            </div>
            <div className="h-2 w-full bg-ink-100 rounded-full overflow-hidden">
              <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** 仪表盘加载骨架 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <Skeleton className="h-28 w-full" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 lg:col-span-2" />
        <Skeleton className="h-72" />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = () => {
    setLoading(true)
    setError(false)
    analyticsApi.dashboard()
      .then((d) => setData(d))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6) return '夜深了'
    if (h < 12) return '早上好'
    if (h < 14) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  })()

  if (loading) return <DashboardSkeleton />

  if (error || !data) {
    return (
      <EmptyState
        icon={Inbox}
        title="暂无仪表盘数据"
        description="网络异常或尚未生成学习数据，请稍后重试。"
        action={<button onClick={load} className="lf-btn-primary">重新加载</button>}
      />
    )
  }

  const totalHours = (data.user.total_focus_minutes / 60).toFixed(1)

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 顶部欢迎区 */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white p-6 lg:p-8">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 85% 15%, rgba(245,158,11,0.5) 0%, transparent 45%)' }} />
        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">{greeting}，{user?.username ?? '同学'} 👋</h1>
            <p className="text-white/70 mt-1.5 text-sm">继续保持学习节奏，每一次专注都在塑造更好的自己。</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <Award size={18} className="text-gold-300" />
              <div>
                <div className="text-lg font-bold leading-none">Lv.{data.user.level}</div>
                <div className="text-[11px] text-white/60 mt-0.5">当前等级</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <Flame size={18} className="text-orange-300" />
              <div>
                <div className="text-lg font-bold leading-none">{data.user.streak_days}<span className="text-sm font-normal ml-0.5">天</span></div>
                <div className="text-[11px] text-white/60 mt-0.5">连续打卡</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 backdrop-blur border border-white/15">
              <Trophy size={18} className="text-gold-300" />
              <div>
                <div className="text-lg font-bold leading-none">#{data.rank}</div>
                <div className="text-[11px] text-white/60 mt-0.5">当前排名</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 今日数据卡片行 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Timer} label="今日专注" value={`${data.today.focus_minutes}分钟`} sub={`今日 ${data.today.sessions} 个会话`} color="brand" />
        <StatCard icon={ListChecks} label="今日会话" value={data.today.sessions} sub="专注训练次数" color="purple" />
        <StatCard icon={Clock} label="累计专注" value={`${totalHours}小时`} sub={`${data.user.total_sessions} 个会话`} color="gold" />
        <StatCard icon={Network} label="知识节点" value={data.knowledge.nodes} sub={`${data.knowledge.links} 条关联`} color="green" />
      </div>

      {/* 近7天趋势 + 引擎分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">近7天专注趋势</h3>
            </div>
            <span className="text-xs text-ink-400">单位：分钟</span>
          </div>
          {data.weekly_focus.length > 0 ? (
            <WeeklyFocusChart data={data.weekly_focus} />
          ) : (
            <EmptyState icon={TrendingUp} title="暂无专注记录" description="开始一次专注训练，趋势图将出现在这里。" />
          )}
        </Card>

        <Card hover={false}>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-brand-600" />
            <h3 className="font-semibold text-ink-900">引擎使用分布</h3>
          </div>
          {data.engine_distribution.length > 0 ? (
            <EngineDistribution data={data.engine_distribution} />
          ) : (
            <EmptyState icon={Sparkles} title="暂无引擎数据" description="使用学习引擎后这里会展示分布。" />
          )}
        </Card>
      </div>

      {/* 活跃学习计划 + Agent 入口 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">活跃学习计划</h3>
            </div>
            <Link to="/plans" className="text-sm text-brand-600 hover:underline">查看全部</Link>
          </div>
          {data.active_plans.length > 0 ? (
            <div className="space-y-3">
              {data.active_plans.map((p) => (
                <div key={p.id} className="p-3 rounded-xl border border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <Link to="/plans" className="text-sm font-medium text-ink-900 truncate hover:text-brand-600">{p.title}</Link>
                    <span className="text-xs text-ink-500 shrink-0">{p.progress}%</span>
                  </div>
                  <ProgressBar value={p.progress} color={p.progress >= 80 ? 'green' : 'brand'} />
                  {p.deadline && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-ink-400">
                      <Calendar size={12} />
                      截止 {new Date(p.deadline).toLocaleDateString('zh-CN')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="还没有活跃计划"
              description="制定你的第一个学习计划，开启系统化成长。"
              action={<Link to="/plans" className="lf-btn-primary !py-2">创建计划</Link>}
            />
          )}
        </Card>

        {/* Agent 快捷入口 */}
        <Card hover={false} className="relative overflow-hidden bg-gradient-to-br from-ink-900 to-brand-900 text-white border-0">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-brand-500/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-6 w-28 h-28 rounded-full bg-gold-500/10 blur-2xl" />
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/15 mb-4">
              <Bot size={24} className="text-gold-300" />
            </div>
            <h3 className="text-lg font-bold">AI 学习导师</h3>
            <p className="text-sm text-white/70 mt-1.5 leading-relaxed">
              需要学习建议？想优化你的计划？和 AI 导师聊聊，获取个性化辅导。
            </p>
            <Link to="/agent" className="lf-btn-primary w-full mt-5 !py-2.5">
              <Bot size={18} /> 和导师对话 <ArrowRight size={16} />
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
