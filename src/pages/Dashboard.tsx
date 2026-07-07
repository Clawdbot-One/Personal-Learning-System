// 仪表盘 — 学习总览
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  Trophy, Flame, Network, Clock, TrendingUp, Calendar, CheckCircle2,
  Circle, ArrowRight, Zap, BookOpen, Brain, Target, Activity,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, StatCard, Card, Badge, SectionTitle, EmptyState } from "@/components/ui";
import { analyticsApi } from "@/api/client";
import { useAuthStore } from "@/store/auth";
import type { DashboardData } from "@/types";

// 引擎中文名与配色
const ENGINE_META: Record<string, { label: string; color: string; icon: typeof Zap }> = {
  deliberate_practice: { label: "刻意练习", color: "#2563eb", icon: Zap },
  sponge_reading: { label: "海绵阅读", color: "#f59e0b", icon: BookOpen },
  deep_work: { label: "深度工作", color: "#10b981", icon: Clock },
  knowledge_action: { label: "知行转化", color: "#8b5cf6", icon: Target },
  critical_thinking: { label: "批判思维", color: "#ef4444", icon: Brain },
};

const PIE_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#94a3b8"];

const TASK_ICON: Record<string, typeof Circle> = {
  action_item: Target,
  milestone: CheckCircle2,
  suggestion: Zap,
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .dashboard()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Layout>
        <Loading text="正在加载学习数据..." />
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout>
        <EmptyState
          icon={<Activity className="w-10 h-10" />}
          title="暂无数据"
          description="开始学习后即可看到你的学习总览"
        />
      </Layout>
    );
  }

  const engineDist = data.engine_distribution.map((e) => ({
    name: ENGINE_META[(e as { name: string }).name]?.label ?? (e as { name: string }).name,
    value: (e as { value: number }).value,
    raw: (e as { name: string }).name,
  }));
  const totalEngine = engineDist.reduce((s, e) => s + e.value, 0);

  return (
    <Layout>
      {/* 欢迎区 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-slide-up">
        <div>
          <h1 className="lf-page-title">
            你好，{user?.username || "学习者"}
            <span className="ml-2 text-2xl">👋</span>
          </h1>
          <p className="lf-page-subtitle">
            {data.level_icon} {data.level_name} · 已连续学习 {data.streak_days} 天，继续保持！
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="gold">
            <Flame className="w-3.5 h-3.5" /> {data.streak_days} 天连击
          </Badge>
          <Badge variant="brand">
            <Trophy className="w-3.5 h-3.5" /> {data.level_name}
          </Badge>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="总积分"
          value={data.total_points}
          hint="PTS"
          accent="gold"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="连续天数"
          value={data.streak_days}
          hint="DAYS"
          accent="brand"
        />
        <StatCard
          icon={<Network className="w-5 h-5" />}
          label="知识节点"
          value={data.total_knowledge_nodes}
          hint="NODES"
          accent="success"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="深度专注"
          value={data.total_focus_minutes}
          hint="分钟"
          accent="brand"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 每周学习时长 */}
        <Card className="lg:col-span-2 p-5">
          <SectionTitle
            title="本周学习时长"
            subtitle="最近 7 天每日学习分钟数"
            action={
              <Badge variant="default">
                <TrendingUp className="w-3.5 h-3.5" />
                {data.weekly_data.reduce((s, d) => s + d.minutes, 0)} 分钟
              </Badge>
            }
          />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weekly_data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "#9aa3b2" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#9aa3b2" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(37,99,235,0.06)" }}
                  contentStyle={{
                    borderRadius: 8, border: "1px solid #e2e5ea", fontSize: 13,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(v: number) => [`${v} 分钟`, "学习时长"]}
                />
                <Bar dataKey="minutes" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 引擎分布 */}
        <Card className="p-5">
          <SectionTitle title="引擎分布" subtitle="各学习引擎使用次数" />
          {engineDist.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-sm text-ink-400">
              暂无学习记录
            </div>
          ) : (
            <>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={engineDist}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={42}
                      outerRadius={64}
                      paddingAngle={2}
                    >
                      {engineDist.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e5ea", fontSize: 13 }}
                      formatter={(v: number, n: string) => [`${v} 次`, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {engineDist.map((e, i) => (
                  <div key={e.raw} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-ink-700">{e.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-ink-900 font-medium font-mono">{e.value}</span>
                      <span className="text-xs text-ink-400">
                        {totalEngine > 0 ? Math.round((e.value / totalEngine) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 今日任务 */}
        <Card className="p-5">
          <SectionTitle
            title="今日任务"
            subtitle="今日推荐与待办"
            action={
              <Link to="/plans" className="lf-btn-ghost text-xs px-2.5 py-1.5">
                查看计划 <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            }
          />
          <div className="space-y-2">
            {data.today_tasks.length === 0 ? (
              <div className="text-sm text-ink-400 py-6 text-center">今日无待办，去探索学习引擎吧 🚀</div>
            ) : (
              data.today_tasks.map((t, i) => {
                const task = t as { type: string; title: string; link: string };
                const Icon = TASK_ICON[task.type] ?? Circle;
                return (
                  <Link
                    key={i}
                    to={task.link}
                    className="flex items-center gap-3 p-3 rounded-lg border border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 transition-all group"
                  >
                    <div className="w-8 h-8 rounded-md bg-brand-50 flex items-center justify-center shrink-0 group-hover:bg-brand-100">
                      <Icon className="w-4 h-4 text-brand-600" />
                    </div>
                    <span className="text-sm text-ink-800 flex-1 truncate">{task.title}</span>
                    <Badge variant={task.type === "milestone" ? "gold" : task.type === "action_item" ? "brand" : "default"}>
                      {task.type === "milestone" ? "里程碑" : task.type === "action_item" ? "行动" : "建议"}
                    </Badge>
                    <ArrowRight className="w-4 h-4 text-ink-300 group-hover:text-brand-500 transition-colors" />
                  </Link>
                );
              })
            )}
          </div>
        </Card>

        {/* 最近活动 */}
        <Card className="p-5">
          <SectionTitle title="最近学习" subtitle="近期学习会话记录" />
          {data.recent_sessions.length === 0 ? (
            <div className="text-sm text-ink-400 py-6 text-center">还没有学习记录，开始第一次学习吧</div>
          ) : (
            <div className="space-y-2">
              {(data.recent_sessions as {
                id: string; engine_type: string; performance_score: number;
                duration_minutes: number; started_at: string; completed: boolean;
              }[]).slice(0, 6).map((s) => {
                const meta = ENGINE_META[s.engine_type] ?? { label: s.engine_type, color: "#94a3b8", icon: Activity };
                const Icon = meta.icon;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-ink-50 transition-colors">
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                      style={{ background: `${meta.color}1a`, color: meta.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-ink-800 truncate">{meta.label}</div>
                      <div className="text-xs text-ink-400 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        {s.started_at ? new Date(s.started_at).toLocaleString("zh-CN", {
                          month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
                        }) : "—"}
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        {s.duration_minutes} 分钟
                      </div>
                    </div>
                    {s.completed ? (
                      <Badge variant="success"><CheckCircle2 className="w-3 h-3" /> 已完成</Badge>
                    ) : (
                      <Badge variant="default"><Circle className="w-3 h-3" /> 进行中</Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* 底部留白 */}
      <div className="h-2" />
    </Layout>
  );
}
