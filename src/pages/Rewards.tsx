// 奖励中心 — 多学科融合奖励 · 心理学 × 社会学 × 金融学
import { useEffect, useMemo, useState } from "react";
import {
  Trophy, Flame, Coins, Award, Gift, Lock, Crown, Medal, Sparkles,
  TrendingUp, Star, Target, Activity,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import { rewardsApi } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";
import type { Reward, Achievement, LeaderboardEntry } from "@/types";

// 等级体系
const LEVELS = [
  { name: "学徒", min_points: 0, icon: "🌱" },
  { name: "行者", min_points: 100, icon: "⚡" },
  { name: "匠人", min_points: 500, icon: "🔨" },
  { name: "专家", min_points: 1500, icon: "🎯" },
  { name: "大师", min_points: 5000, icon: "👑" },
  { name: "宗师", min_points: 15000, icon: "🌟" },
];

// 奖励类型元数据
const REWARD_META: Record<string, { icon: typeof Coins; color: string; bg: string }> = {
  points: { icon: Coins, color: "text-gold-600", bg: "bg-gold-50" },
  badge: { icon: Award, color: "text-brand-600", bg: "bg-brand-50" },
  streak: { icon: Flame, color: "text-red-500", bg: "bg-red-50" },
  surprise: { icon: Gift, color: "text-purple-600", bg: "bg-purple-50" },
};

// 三大学科维度
const DISCIPLINES = [
  { name: "心理学", desc: "变动比率惊喜", icon: Sparkles, color: "from-purple-500 to-purple-600", badge: "bg-purple-50 text-purple-700" },
  { name: "社会学", desc: "等级与排行", icon: Crown, color: "from-gold-400 to-gold-600", badge: "bg-gold-50 text-gold-700" },
  { name: "金融学", desc: "积分 ROI", icon: TrendingUp, color: "from-brand-500 to-brand-700", badge: "bg-brand-50 text-brand-700" },
];

function levelInfo(points: number) {
  let current = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = null;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min_points) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
    }
  }
  if (!next) return { current, next: null, progress: 1, remaining: 0 };
  const progress = (points - current.min_points) / (next.min_points - current.min_points);
  return { current, next, progress, remaining: next.min_points - points };
}

function fmtTime(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(s: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

export default function Rewards() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<{ total_points: number; level_name: string; level_icon: string; streak_days: number } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [history, setHistory] = useState<Reward[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      rewardsApi.balance(),
      rewardsApi.achievements(),
      rewardsApi.history(15),
      rewardsApi.leaderboard(),
    ])
      .then(([b, a, h, l]) => {
        setBalance(b);
        setAchievements(a);
        setHistory(h);
        setLeaderboard(l);
      })
      .finally(() => setLoading(false));
  }, []);

  const earnedCount = useMemo(() => achievements.filter((a) => a.earned).length, [achievements]);
  const li = balance ? levelInfo(balance.total_points) : null;
  // 兼容 user 兜底
  const totalPoints = balance?.total_points ?? user?.total_points ?? 0;
  const levelName = balance?.level_name ?? user?.level_name ?? "学徒";
  const levelIcon = balance?.level_icon ?? user?.level_icon ?? "🌱";
  const streakDays = balance?.streak_days ?? user?.streak_days ?? 0;
  const level = li ?? levelInfo(totalPoints);

  if (loading) {
    return (
      <Layout>
        <Loading text="正在加载奖励数据..." />
      </Layout>
    );
  }

  return (
    <Layout>
      {/* 页头 */}
      <div className="mb-6 animate-slide-up">
        <h1 className="lf-page-title flex items-center gap-2">
          <Trophy className="w-7 h-7 text-gold-500" /> 奖励中心
        </h1>
        <p className="lf-page-subtitle">多学科融合奖励 · 心理学 × 社会学 × 金融学</p>
      </div>

      {/* 顶部 Hero 卡片 */}
      <Card className="p-0 overflow-hidden mb-6 animate-scale-in">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-6 text-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-gold-400/10 rounded-full -mb-20" />
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* 积分与等级 */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-4xl leading-none">{levelIcon}</span>
                <div>
                  <div className="text-sm text-white/70">当前等级</div>
                  <div className="text-2xl font-bold font-display flex items-center gap-2">
                    {levelName}
                    <Badge variant="gold"><Flame className="w-3 h-3" /> 连续 {streakDays} 天</Badge>
                  </div>
                </div>
              </div>
              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-5xl font-bold font-display tracking-tight">{totalPoints.toLocaleString()}</span>
                <span className="text-white/70 text-sm font-mono">PTS 总积分</span>
              </div>
              {/* 下一级进度 */}
              <div>
                <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                  <span>{level.next ? `距离「${level.next.name}」还需 ${level.remaining} 积分` : "已达最高等级"}</span>
                  <span className="font-mono">{level.next ? `${Math.round(level.progress * 100)}%` : "MAX"}</span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-gold-300 to-gold-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, level.progress * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 三大学科徽章 */}
            <div className="space-y-2">
              {DISCIPLINES.map((d) => {
                const Icon = d.icon;
                return (
                  <div key={d.name} className="flex items-center gap-2.5 bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2">
                    <div className={cn("w-8 h-8 rounded-md bg-gradient-to-br flex items-center justify-center shrink-0", d.color)}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold leading-tight">{d.name}</div>
                      <div className="text-[11px] text-white/70 leading-tight truncate">{d.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 成就网格 */}
        <Card className="lg:col-span-2 p-5">
          <SectionTitle
            title="成就殿堂"
            subtitle={`已解锁 ${earnedCount}/${achievements.length || 12} 项成就`}
            action={<Badge variant="gold"><Star className="w-3.5 h-3.5" /> {earnedCount} 已解锁</Badge>}
          />
          {achievements.length === 0 ? (
            <EmptyState icon={<Trophy className="w-10 h-10" />} title="暂无成就数据" description="开始学习即可解锁成就" />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {achievements.map((a) => (
                <div
                  key={a.key}
                  className={cn(
                    "relative rounded-xl border p-3.5 text-center transition-all",
                    a.earned
                      ? "border-gold-200 bg-gradient-to-b from-gold-50 to-white shadow-card hover:shadow-cardhover"
                      : "border-ink-200 bg-ink-50/60 opacity-70"
                  )}
                >
                  <div className="text-3xl mb-1.5 leading-none">
                    {a.earned ? a.icon : <Lock className="w-6 h-6 mx-auto text-ink-300" />}
                  </div>
                  <div className={cn("text-sm font-semibold mb-0.5 truncate", a.earned ? "text-ink-900" : "text-ink-400")}>
                    {a.name}
                  </div>
                  <div className={cn("text-[11px] leading-tight line-clamp-2", a.earned ? "text-ink-500" : "text-ink-400")}>
                    {a.desc}
                  </div>
                  {a.earned && a.earned_at && (
                    <div className="text-[10px] text-gold-600 font-mono mt-1.5">{fmtDate(a.earned_at)}</div>
                  )}
                  {a.earned && (
                    <Sparkles className="w-3.5 h-3.5 text-gold-400 absolute top-2 right-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 排行榜 */}
        <Card className="p-5">
          <SectionTitle title="学习排行榜" subtitle="总积分排名" action={<Badge variant="brand"><Crown className="w-3.5 h-3.5" /> TOP {leaderboard.length}</Badge>} />
          {leaderboard.length === 0 ? (
            <EmptyState icon={<Crown className="w-10 h-10" />} title="暂无排行数据" />
          ) : (
            <div className="space-y-1.5">
              {leaderboard.map((entry) => {
                const isMe = entry.user_id === user?.id || entry.username.includes("(你)");
                const rankStyle =
                  entry.rank === 1 ? "bg-gradient-to-br from-gold-300 to-gold-500 text-white" :
                  entry.rank === 2 ? "bg-gradient-to-br from-ink-300 to-ink-400 text-white" :
                  entry.rank === 3 ? "bg-gradient-to-br from-gold-700 to-gold-800 text-white" :
                  "bg-ink-100 text-ink-500";
                return (
                  <div
                    key={entry.user_id + entry.rank}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-lg transition-all",
                      isMe ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-ink-50"
                    )}
                  >
                    <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0", rankStyle)}>
                      {entry.rank <= 3 ? <Medal className="w-4 h-4" /> : entry.rank}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                      {entry.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-ink-900 truncate flex items-center gap-1">
                        {entry.username}
                        {isMe && <Badge variant="brand">你</Badge>}
                      </div>
                      <div className="text-xs text-ink-400">{entry.level_icon} {entry.level_name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-ink-900">{entry.total_points.toLocaleString()}</div>
                      <div className="text-[10px] text-ink-400">PTS</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 奖励历史时间线 */}
        <Card className="lg:col-span-2 p-5">
          <SectionTitle title="奖励记录" subtitle="近期获得的奖励时间线" action={<Badge variant="gold"><Coins className="w-3.5 h-3.5" /> {history.length} 条</Badge>} />
          {history.length === 0 ? (
            <EmptyState icon={<Gift className="w-10 h-10" />} title="还没有奖励记录" description="完成学习任务即可获得奖励" />
          ) : (
            <div className="relative pl-6">
              {/* 竖线 */}
              <div className="absolute left-2 top-2 bottom-2 w-px bg-ink-200" />
              <div className="space-y-4">
                {history.map((r) => {
                  const meta = REWARD_META[r.reward_type] ?? REWARD_META.points;
                  const Icon = meta.icon;
                  return (
                    <div key={r.id} className="relative animate-fade-in">
                      <div className={cn("absolute -left-[18px] w-4 h-4 rounded-full flex items-center justify-center ring-4 ring-white", meta.bg)}>
                        <Icon className={cn("w-2.5 h-2.5", meta.color)} />
                      </div>
                      <div className="flex items-start justify-between gap-3 bg-ink-50/50 rounded-lg p-3 hover:bg-ink-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-ink-800">{r.description || r.badge_name || "获得奖励"}</div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="default">
                              <Icon className={cn("w-3 h-3", meta.color)} />
                              {r.reward_type === "points" ? "积分" : r.reward_type === "badge" ? "徽章" : r.reward_type === "streak" ? "连击" : "惊喜"}
                            </Badge>
                            {r.badge_name && <span className="text-xs text-gold-600 font-medium">{r.badge_name}</span>}
                            <span className="text-xs text-ink-400 font-mono">{fmtTime(r.earned_at)}</span>
                          </div>
                        </div>
                        {r.points > 0 && (
                          <div className="text-right shrink-0">
                            <div className="text-base font-bold font-mono text-gold-600">+{r.points}</div>
                            <div className="text-[10px] text-ink-400">PTS</div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        {/* 等级体系说明 */}
        <Card className="p-5">
          <SectionTitle title="等级体系" subtitle="六个成长阶段" action={<Badge variant="brand"><Target className="w-3.5 h-3.5" /> 社会学</Badge>} />
          <div className="space-y-2">
            {LEVELS.map((lv, i) => {
              const isCurrent = lv.name === levelName;
              const isPassed = totalPoints >= lv.min_points;
              return (
                <div
                  key={lv.name}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg border transition-all",
                    isCurrent ? "border-brand-300 bg-brand-50" : isPassed ? "border-ink-200 bg-white" : "border-ink-100 bg-ink-50/50 opacity-70"
                  )}
                >
                  <span className="text-2xl leading-none">{lv.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={cn("text-sm font-semibold flex items-center gap-1.5", isPassed ? "text-ink-900" : "text-ink-400")}>
                      {lv.name}
                      {isCurrent && <Badge variant="brand">当前</Badge>}
                    </div>
                    <div className="text-xs text-ink-400 font-mono">
                      {i === 0 ? "起步" : `≥ ${lv.min_points.toLocaleString()} 积分`}
                    </div>
                  </div>
                  {isPassed && !isCurrent && <Star className="w-4 h-4 text-gold-400 fill-gold-400" />}
                  {isCurrent && <Activity className="w-4 h-4 text-brand-500 animate-pulse-soft" />}
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-ink-100 text-xs text-ink-400 leading-relaxed">
            奖励系统融合三大学科：<span className="text-purple-600 font-medium">心理学</span>（变动比率惊喜）、
            <span className="text-gold-600 font-medium">社会学</span>（等级与排行）、
            <span className="text-brand-600 font-medium">金融学</span>（积分 ROI 量化）。
          </div>
        </Card>
      </div>

      <div className="h-2" />
    </Layout>
  );
}
