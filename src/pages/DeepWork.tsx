// 深度工作 — 番茄钟 + 专注保护 + 策略推荐
import { useEffect, useRef, useState } from "react";
import {
  Clock, Play, Pause, RotateCcw, Plus, CheckCircle2,
  Target, Zap, Timer, Activity, AlertCircle, Loader2, Mountain,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, StatCard, EmptyState, SectionTitle } from "@/components/ui";
import { learningApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { FocusSession } from "@/types";

const STRATEGIES = [
  { key: "monastic", name: "禁欲式", desc: "彻底屏蔽浅层工作，长时间专注单一目标", suitable: "科研、写作" },
  { key: "bimodal", name: "双峰式", desc: "深度期与开放期交替，如每周3-4天深度", suitable: "学者、创业" },
  { key: "rhythmic", name: "节奏式", desc: "每天固定时段深度工作，形成习惯节律", suitable: "上班族、学生" },
  { key: "journalistic", name: "新闻记者式", desc: "随时切入深度模式，利用碎片时间", suitable: "高管、记者" },
];

const PRESETS = [25, 50, 90];

const STATIC_RITUAL = [
  { action: "关闭通知，开启勿扰模式", purpose: "阻断外部干扰" },
  { action: "准备水杯，调整坐姿", purpose: "建立环境仪式感" },
  { action: "明确本次深度工作的单一目标", purpose: "聚焦任务" },
  { action: "深呼吸三次，正式开始", purpose: "心理切换到深度模式" },
];

function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type Stats = {
  total_sessions?: number; total_minutes?: number; avg_focus_quality?: number;
  deep_work_ratio?: number; best_time_slot?: string; recommendation?: string;
  energy_curve?: { hour: string; minutes: number; quality: number }[];
};

export default function DeepWork() {
  // 设置阶段
  const [taskName, setTaskName] = useState("");
  const [strategy, setStrategy] = useState("rhythmic");
  const [planned, setPlanned] = useState(25);

  // 运行阶段
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [distractions, setDistractions] = useState(0);
  const [starting, setStarting] = useState(false);
  const [completing, setCompleting] = useState(false);

  // 数据
  const [stats, setStats] = useState<Stats | null>(null);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [loading, setLoading] = useState(true);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // 始终指向最新的完成函数，避免定时器闭包捕获过期值
  const completeRef = useRef<(auto?: boolean) => void>(() => {});
  // 防止重复提交（定时器归零与手动完成同时触发）
  const completingRef = useRef(false);

  const fetchData = () => {
    Promise.all([
      learningApi.focusStats().catch(() => null),
      learningApi.focusSessions().catch(() => [] as FocusSession[]),
    ]).then(([s, sess]) => { setStats(s); setSessions(sess); }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // 倒计时驱动
  useEffect(() => {
    if (running && sessionId) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            completeRef.current(true);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, sessionId]);

  const start = async () => {
    setStarting(true);
    try {
      const res = await learningApi.startFocus({
        task_name: taskName.trim() || "深度工作",
        work_type: "deep",
        strategy,
        planned_minutes: planned,
      });
      setSessionId(res.id);
      setSecondsLeft(planned * 60);
      setDistractions(0);
      setRunning(true);
    } finally {
      setStarting(false);
    }
  };

  const pause = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
  const resume = () => setRunning(true);

  const handleComplete = async (auto = false) => {
    if (!sessionId || completingRef.current) return;
    completingRef.current = true;
    pause();
    setCompleting(true);
    const elapsedMin = Math.max(1, Math.round((planned * 60 - secondsLeft) / 60));
    try {
      await learningApi.completeFocus(sessionId, { actual_minutes: auto ? planned : elapsedMin, distraction_count: distractions });
      reset();
      fetchData();
    } finally {
      completingRef.current = false;
      setCompleting(false);
    }
  };

  const reset = () => {
    pause();
    setSessionId(null);
    setSecondsLeft(planned * 60);
    setDistractions(0);
    setRunning(false);
  };

  const addDistraction = () => setDistractions((d) => d + 1);

  // 让定时器始终调用最新版本的 handleComplete（读取最新 distractions 等）
  useEffect(() => { completeRef.current = handleComplete; });

  const totalSec = planned * 60;
  const progress = sessionId ? 1 - secondsLeft / totalSec : 0;
  const active = sessionId !== null;

  // 本周专注时长（最近7天）
  const weeklyData = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const minutes = sessions
        .filter((s) => s.completed && s.completed_at && new Date(s.completed_at).toDateString() === key)
        .reduce((sum, s) => sum + (s.actual_minutes || 0), 0);
      days.push({ date: d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }), minutes });
    }
    return days;
  })();

  return (
    <Layout>
      <div className="mb-6 animate-slide-up">
        <h1 className="lf-page-title flex items-center gap-2">
          <Clock className="w-7 h-7 text-green-600" /> 深度工作
        </h1>
        <p className="lf-page-subtitle">在无干扰状态下专注进行认知挑战性工作</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 计时器主区 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            {!active ? (
              <>
                <SectionTitle title="开始深度工作" subtitle="设定任务、策略与时长" />
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">任务名称</label>
                  <input type="text" value={taskName} onChange={(e) => setTaskName(e.target.value)}
                    className="lf-input" placeholder="例如：完成项目方案设计" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-ink-700 mb-2">深度工作策略</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STRATEGIES.map((s) => {
                      const sel = strategy === s.key;
                      return (
                        <button key={s.key} type="button" onClick={() => setStrategy(s.key)}
                          className={cn("p-3 rounded-lg border text-left transition-all",
                            sel ? "border-green-400 bg-green-50 shadow-sm" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50")}>
                          <div className={cn("text-sm font-semibold", sel ? "text-green-700" : "text-ink-800")}>{s.name}</div>
                          <div className="text-xs text-ink-500 mt-1 leading-relaxed">{s.desc}</div>
                          <div className="text-[10px] text-ink-400 mt-1">适合：{s.suitable}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-ink-700 mb-2">专注时长</label>
                  <div className="flex gap-2">
                    {PRESETS.map((m) => (
                      <button key={m} type="button" onClick={() => setPlanned(m)}
                        className={cn("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-all",
                          planned === m ? "border-green-400 bg-green-50 text-green-700" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
                        <Timer className="w-4 h-4 inline mr-1" />{m} 分钟
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={start} disabled={starting} className="lf-btn-primary w-full bg-green-600 hover:bg-green-700">
                  {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  {starting ? "启动中..." : "开始深度工作"}
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="brand"><Target className="w-3 h-3" /> {STRATEGIES.find((s) => s.key === strategy)?.name}</Badge>
                  {taskName && <span className="text-sm text-ink-700 font-medium truncate max-w-[200px]">{taskName}</span>}
                </div>
                <CircularTimer progress={progress} secondsLeft={secondsLeft} running={running} />
                {/* 分心计数 */}
                <div className="flex items-center gap-3 my-4">
                  <button onClick={addDistraction} disabled={completing}
                    className="lf-btn-secondary border-red-200 text-red-600 hover:bg-red-50">
                    <Plus className="w-4 h-4" /> 分心 {distractions}
                  </button>
                  <span className="text-xs text-ink-400">每次分心点击 +1 记录</span>
                </div>
                {/* 控制按钮 */}
                <div className="flex items-center gap-2">
                  {running ? (
                    <button onClick={pause} className="lf-btn-secondary"><Pause className="w-4 h-4" /> 暂停</button>
                  ) : (
                    <button onClick={resume} className="lf-btn-primary"><Play className="w-4 h-4" /> 继续</button>
                  )}
                  <button onClick={() => handleComplete(false)} disabled={completing} className="lf-btn-gold">
                    {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {completing ? "提交中..." : "完成"}
                  </button>
                  <button onClick={reset} className="lf-btn-ghost"><RotateCcw className="w-4 h-4" /> 重置</button>
                </div>
              </div>
            )}
          </Card>

          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard icon={<Activity className="w-5 h-5" />} label="总会话数" value={stats?.total_sessions ?? 0} hint="次" accent="brand" />
            <StatCard icon={<Clock className="w-5 h-5" />} label="累计专注" value={stats?.total_minutes ?? 0} hint="分钟" accent="success" />
            <StatCard icon={<Zap className="w-5 h-5" />} label="平均质量" value={stats?.avg_focus_quality !== undefined ? `${Math.round(stats.avg_focus_quality * 100)}%` : "—"} hint="QUALITY" accent="gold" />
          </div>

          {/* 本周专注 */}
          <Card className="p-5">
            <SectionTitle title="本周专注时长" subtitle="最近 7 天每日深度工作分钟数" />
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="focusBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f7" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9aa3b2" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9aa3b2" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(16,185,129,0.06)" }} contentStyle={{ borderRadius: 8, border: "1px solid #e2e5ea", fontSize: 13 }}
                    formatter={(v: number) => [`${v} 分钟`, "专注时长"]} />
                  <Bar dataKey="minutes" fill="url(#focusBar)" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {stats?.recommendation && (
              <div className="mt-3 flex items-start gap-2 p-3 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{stats.recommendation}</span>
              </div>
            )}
          </Card>
        </div>

        {/* 右侧：仪式清单 + 最佳时段 */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title="启动仪式" subtitle="进入深度模式前的准备清单" />
            <RitualChecklist />
          </Card>
          {stats?.best_time_slot && (
            <Card className="p-5">
              <SectionTitle title="最佳专注时段" subtitle="基于历史会话质量分析" />
              <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Mountain className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-green-600">你的高效时段</div>
                  <div className="text-lg font-bold font-display text-green-700">{stats.best_time_slot}</div>
                </div>
              </div>
              {stats.deep_work_ratio !== undefined && (
                <div className="mt-3 text-xs text-ink-500">
                  深度工作占比：<span className="font-mono font-bold text-ink-700">{Math.round(stats.deep_work_ratio * 100)}%</span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* 历史会话 */}
      <Card className="p-5">
        <SectionTitle title="专注历史" subtitle={`最近 ${sessions.length} 次会话`} />
        {loading ? (
          <Loading text="加载历史会话..." />
        ) : sessions.length === 0 ? (
          <EmptyState icon={<Clock className="w-12 h-12" />} title="还没有深度工作记录"
            description="完成第一次深度工作会话后，这里将显示你的专注历史。" />
        ) : (
          <div className="space-y-2">
            {sessions.slice(0, 10).map((s) => {
              const strat = STRATEGIES.find((x) => x.key === s.strategy)?.name ?? s.strategy;
              return (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-ink-100 hover:bg-ink-50 transition-colors">
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                    s.completed ? "bg-green-50 text-green-600" : "bg-ink-100 text-ink-400")}>
                    {s.completed ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-800 truncate">{s.task_name}</div>
                    <div className="text-xs text-ink-400 flex items-center gap-2 mt-0.5">
                      <span>{strat}</span><span>·</span>
                      <span>{s.completed ? `${s.actual_minutes} 分钟` : `计划 ${s.planned_minutes} 分钟`}</span>
                      {s.distraction_count > 0 && <><span>·</span><span className="text-red-500">分心 {s.distraction_count}</span></>}
                    </div>
                  </div>
                  <div className="text-xs text-ink-400 font-mono shrink-0">
                    {new Date(s.started_at).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </div>
                  {s.completed ? <Badge variant="success">已完成</Badge> : <Badge variant="default">进行中</Badge>}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </Layout>
  );
}

function CircularTimer({ progress, secondsLeft, running }: { progress: number; secondsLeft: number; running: boolean }) {
  const r = 80;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - progress);
  return (
    <div className="relative w-56 h-56 my-4">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#e2e5ea" strokeWidth="10" />
        <circle cx="100" cy="100" r={r} fill="none" stroke="url(#timerGrad)" strokeWidth="10"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s linear" }} />
        <defs>
          <linearGradient id="timerGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={cn("text-4xl font-bold font-mono text-ink-900", running && "text-green-600")}>{fmtTime(secondsLeft)}</div>
        <div className="text-xs text-ink-400 mt-1">{running ? "专注中" : "已暂停"}</div>
      </div>
    </div>
  );
}

function RitualChecklist() {
  const [checked, setChecked] = useState<boolean[]>(() => STATIC_RITUAL.map(() => false));
  return (
    <div className="space-y-2">
      {STATIC_RITUAL.map((r, i) => (
        <button key={i} type="button" onClick={() => setChecked((c) => c.map((v, idx) => (idx === i ? !v : v)))}
          className={cn("w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all",
            checked[i] ? "border-green-300 bg-green-50" : "border-ink-200 hover:bg-ink-50")}>
          <div className={cn("w-5 h-5 rounded-md flex items-center justify-center shrink-0",
            checked[i] ? "bg-green-500 text-white" : "bg-ink-100 text-ink-300")}>
            {checked[i] ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
          </div>
          <div className="flex-1 min-w-0">
            <div className={cn("text-sm", checked[i] ? "text-green-800 line-through" : "text-ink-800")}>{r.action}</div>
            <div className="text-xs text-ink-400">{r.purpose}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
