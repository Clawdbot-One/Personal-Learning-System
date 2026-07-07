/**
 * 奖励中心 —— 跨学科激励系统
 * 心理学（成就动机）+ 社会学（竞争排行）+ 金融学（代币商城）
 */
import { useEffect, useState } from 'react'
import {
  Award, Trophy, Star, Flame, Target, Brain, Compass, Sparkles, Zap,
  BookOpen, Gift, Coffee, Clock, Crown, Medal, Lock, Loader2, History,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { PageHeader, Card, ProgressRing, EmptyState, Skeleton } from '@/components/ui'
import { rewardsApi } from '@/lib/api'
import { useAuthStore, toast } from '@/store/auth'
import type { Achievement } from '@/lib/types'

const ICON_MAP: Record<string, LucideIcon> = {
  award: Award, trophy: Trophy, star: Star, flame: Flame, target: Target,
  brain: Brain, compass: Compass, sparkles: Sparkles, zap: Zap, book: BookOpen,
  gift: Gift, coffee: Coffee, clock: Clock, crown: Crown, medal: Medal,
}
const getIcon = (name?: string): LucideIcon => ICON_MAP[(name ?? '').toLowerCase()] ?? Award

const TIER_STYLE: Record<string, { wrap: string; chip: string }> = {
  bronze: { wrap: 'border-amber-600 bg-amber-50', chip: 'bg-amber-200/60 text-amber-800' },
  silver: { wrap: 'border-slate-400 bg-slate-50', chip: 'bg-slate-200/70 text-slate-700' },
  gold: { wrap: 'border-gold-500 bg-gold-50', chip: 'bg-gold-200/60 text-gold-800' },
}
const MEDAL = ['#f59e0b', '#9ca3af', '#cd7f32']

type Balance = { points: number; level: number; streak_days: number; total_focus_minutes: number }
type LBItem = { id: string; username: string; avatar: string; points: number; level: number; streak_days: number; rank: number; is_me: boolean }
type LB = { top: LBItem[]; my_rank: number; my_points: number }
type LedgerItem = { id: string; type: string; amount: number; reason: string; created_at: string }
type ShopItem = { id: string; name: string; description: string; cost: number; icon: string }

function fmtTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

export default function Rewards() {
  const { refreshUser } = useAuthStore()
  const [balance, setBalance] = useState<Balance | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [leaderboard, setLeaderboard] = useState<LB | null>(null)
  const [shop, setShop] = useState<ShopItem[]>([])
  const [ledger, setLedger] = useState<LedgerItem[]>([])
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const [b, a, lb, s, ld] = await Promise.all([
          rewardsApi.balance(), rewardsApi.achievements(), rewardsApi.leaderboard(10),
          rewardsApi.shop(), rewardsApi.ledger(10),
        ])
        setBalance(b); setAchievements(a); setLeaderboard(lb); setShop(s); setLedger(ld)
      } catch (e) {
        toast((e as Error).message, 'error')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleClaim = async (item: ShopItem) => {
    setClaiming(item.id)
    try {
      const res = await rewardsApi.claim(item.id)
      toast(`兑换成功：${res.item.name} · 剩余 ${res.remaining_points} 积分`, 'reward')
      setBalance((prev) => (prev ? { ...prev, points: res.remaining_points } : prev))
      refreshUser()
      rewardsApi.ledger(10).then(setLedger).catch(() => {})
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setClaiming(null)
    }
  }

  // 等级进度：level = floor(sqrt(points/100)) + 1，下一级阈值 = level^2 * 100
  const level = balance?.level ?? 1
  const points = balance?.points ?? 0
  const base = (level - 1) ** 2 * 100
  const next = level ** 2 * 100
  const progress = next > base ? Math.min(100, Math.max(0, ((points - base) / (next - base)) * 100)) : 0

  if (loading) {
    return (
      <div>
        <PageHeader title="奖励中心" subtitle="跨学科激励 · 积分 · 成就 · 排行" />
        <div className="grid lg:grid-cols-3 gap-4 mb-6">
          <Skeleton className="h-40 lg:col-span-1" />
          <Skeleton className="h-40 lg:col-span-2" />
        </div>
        <Skeleton className="h-64" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      <PageHeader title="奖励中心" subtitle="跨学科激励 · 积分 · 成就 · 排行" />

      {/* 顶部余额卡 */}
      <Card className="mb-6 bg-gradient-to-br from-white to-gold-50/40">
        <div className="flex flex-col sm:flex-row items-center sm:items-center gap-6">
          <div className="flex-1 text-center sm:text-left">
            <div className="text-sm text-ink-500 mb-1">当前积分</div>
            <div className="text-5xl font-extrabold text-gold-600 leading-none">{points.toLocaleString()}</div>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 text-gold-700"><Crown size={15} /> Lv.{level}</span>
              <span className="inline-flex items-center gap-1 text-orange-500"><Flame size={15} /> 连续 {balance?.streak_days ?? 0} 天</span>
              <span className="inline-flex items-center gap-1 text-brand-600"><Clock size={15} /> 专注 {Math.round((balance?.total_focus_minutes ?? 0) / 60)} 小时</span>
            </div>
            <div className="mt-3 text-xs text-ink-400">距下一级还需 <span className="font-semibold text-gold-600">{Math.max(0, next - points)}</span> 积分</div>
          </div>
          <ProgressRing value={progress} size={108} stroke={9} color="#f59e0b" label="升级" />
        </div>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左：成就墙 + 流水 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 成就墙 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={18} className="text-gold-600" />
              <h3 className="font-semibold text-ink-900">成就墙</h3>
              <span className="lf-badge bg-ink-100 text-ink-500 ml-auto">
                {achievements.filter((a) => a.unlocked).length}/{achievements.length}
              </span>
            </div>
            {achievements.length === 0 ? (
              <EmptyState icon={Award} title="暂无成就" description="完成学习任务后将解锁成就" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {achievements.map((a) => {
                  const Icon = getIcon(a.icon)
                  const st = TIER_STYLE[a.tier] ?? TIER_STYLE.bronze
                  return (
                    <div
                      key={a.id}
                      className={`relative rounded-xl border-2 p-3 transition-all ${a.unlocked ? st.wrap : 'border-ink-200 bg-ink-50 opacity-60'}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${a.unlocked ? st.chip : 'bg-ink-200 text-ink-400'}`}>
                          {a.unlocked ? <Icon size={18} /> : <Lock size={16} />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-ink-900 truncate">{a.name}</div>
                          <div className="text-[11px] uppercase tracking-wide text-ink-400">{a.tier}</div>
                        </div>
                      </div>
                      <p className="text-xs text-ink-500 mt-2 line-clamp-2">{a.description}</p>
                      {a.unlocked && a.earned_at && (
                        <div className="text-[10px] text-ink-400 mt-1.5">{fmtTime(a.earned_at)}</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* 积分流水 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <History size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">积分流水</h3>
            </div>
            {ledger.length === 0 ? (
              <EmptyState icon={History} title="暂无流水记录" />
            ) : (
              <ul className="divide-y divide-ink-100">
                {ledger.map((l) => (
                  <li key={l.id} className="flex items-center justify-between py-2.5">
                    <div className="min-w-0">
                      <div className="text-sm text-ink-800 truncate">{l.reason}</div>
                      <div className="text-[11px] text-ink-400">{fmtTime(l.created_at)} · {l.type}</div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${l.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {l.amount >= 0 ? '+' : ''}{l.amount}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* 右：排行榜 + 商城 */}
        <div className="space-y-6">
          {/* 排行榜 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Medal size={18} className="text-gold-600" />
              <h3 className="font-semibold text-ink-900">排行榜</h3>
            </div>
            {leaderboard ? (
              <>
                <ul className="space-y-1.5">
                  {leaderboard.top.map((u) => (
                    <li
                      key={u.id}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-lg ${u.is_me ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-ink-50'}`}
                    >
                      <div
                        className="w-6 text-center text-sm font-bold shrink-0"
                        style={{ color: u.rank <= 3 ? MEDAL[u.rank - 1] : undefined }}
                      >
                        {u.rank <= 3 ? <Medal size={16} className="inline" style={{ color: MEDAL[u.rank - 1] }} /> : u.rank}
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                        {u.username?.[0]?.toUpperCase() ?? 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-ink-900 truncate">
                          {u.username}{u.is_me && <span className="text-brand-600">（我）</span>}
                        </div>
                        <div className="text-[11px] text-ink-400">Lv.{u.level} · 连续 {u.streak_days} 天</div>
                      </div>
                      <div className="text-sm font-bold text-gold-600 tabular-nums">{u.points}</div>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 pt-3 border-t border-ink-100 flex items-center justify-between text-sm">
                  <span className="text-ink-500">我的排名</span>
                  <span className="font-semibold text-ink-900">第 {leaderboard.my_rank} 名 · {leaderboard.my_points} 积分</span>
                </div>
              </>
            ) : (
              <EmptyState icon={Medal} title="暂无排行数据" />
            )}
          </Card>

          {/* 积分商城 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Gift size={18} className="text-gold-600" />
              <h3 className="font-semibold text-ink-900">积分商城</h3>
            </div>
            {shop.length === 0 ? (
              <EmptyState icon={Gift} title="商城暂未开放" />
            ) : (
              <div className="space-y-3">
                {shop.map((it) => {
                  const Icon = getIcon(it.icon)
                  const affordable = points >= it.cost
                  return (
                    <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg border border-ink-200 hover:border-gold-300 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-gold-50 text-gold-600 flex items-center justify-center shrink-0">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink-900 truncate">{it.name}</div>
                        <div className="text-xs text-ink-500 line-clamp-1">{it.description}</div>
                        <div className="text-xs text-gold-600 font-semibold mt-0.5">{it.cost} 积分</div>
                      </div>
                      <button
                        onClick={() => handleClaim(it)}
                        disabled={!affordable || claiming === it.id}
                        className="lf-btn-primary !py-1.5 !px-3 text-xs shrink-0"
                      >
                        {claiming === it.id ? <Loader2 size={14} className="animate-spin" /> : affordable ? '兑换' : '积分不足'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
