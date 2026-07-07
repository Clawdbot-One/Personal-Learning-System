// 学习计划管理
import { useEffect, useState, type FormEvent } from "react";
import {
  Target, Plus, Flame, Calendar, CheckCircle2, Circle, X, Loader2,
  AlertCircle, Zap, BookOpen, Clock, Brain, ListChecks, Trash2,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, ProgressBar, EmptyState } from "@/components/ui";
import { plansApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { Plan } from "@/types";

// 引擎中文名
const ENGINE_OPTIONS = [
  { value: "deliberate_practice", label: "刻意练习", icon: Zap, color: "text-brand-600 bg-brand-50" },
  { value: "sponge_reading", label: "海绵阅读", icon: BookOpen, color: "text-gold-600 bg-gold-50" },
  { value: "deep_work", label: "深度工作", icon: Clock, color: "text-green-600 bg-green-50" },
  { value: "knowledge_action", label: "知行转化", icon: Target, color: "text-purple-600 bg-purple-50" },
  { value: "critical_thinking", label: "批判思维", icon: Brain, color: "text-red-600 bg-red-50" },
];

const ENGINE_LABEL: Record<string, string> = Object.fromEntries(
  ENGINE_OPTIONS.map((e) => [e.value, e.label])
);

const STATUS_META: Record<string, { label: string; variant: "brand" | "success" | "default" }> = {
  active: { label: "进行中", variant: "brand" },
  completed: { label: "已完成", variant: "success" },
  paused: { label: "已暂停", variant: "default" },
};

function fmtDate(s: string | null): string {
  if (!s) return "无截止日期";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "无截止日期" : d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function daysLeft(s: string | null): number | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  return diff;
}

export default function Plans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchPlans = () => {
    setLoading(true);
    plansApi
      .list()
      .then(setPlans)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCompleteMilestone = async (planId: string, milestoneId: string) => {
    setCompletingId(`${planId}:${milestoneId}`);
    try {
      await plansApi.completeMilestone(planId, milestoneId);
      fetchPlans();
    } catch (e) {
      console.error(e);
    } finally {
      setCompletingId(null);
    }
  };

  return (
    <Layout>
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="lf-page-title flex items-center gap-2">
            <Target className="w-7 h-7 text-brand-600" /> 学习计划
          </h1>
          <p className="lf-page-subtitle">
            规划你的成长路径 · {plans.length} 个计划 · {plans.filter((p) => p.status === "active").length} 个进行中
          </p>
        </div>
        <button onClick={() => setModalOpen(true)} className="lf-btn-primary">
          <Plus className="w-4 h-4" /> 新建计划
        </button>
      </div>

      {/* 计划列表 */}
      {loading ? (
        <Loading text="正在加载学习计划..." />
      ) : plans.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={<Target className="w-12 h-12" />}
            title="还没有学习计划"
            description="创建你的第一个学习计划，拆解里程碑并逐步完成，让成长更有方向。"
            action={
              <button onClick={() => setModalOpen(true)} className="lf-btn-primary">
                <Plus className="w-4 h-4" /> 创建第一个计划
              </button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              completingId={completingId}
              onComplete={handleCompleteMilestone}
            />
          ))}
        </div>
      )}

      {/* 新建计划弹窗 */}
      {modalOpen && (
        <CreatePlanModal
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            fetchPlans();
          }}
        />
      )}
    </Layout>
  );
}

// ===== 计划卡片 =====
function PlanCard({
  plan,
  completingId,
  onComplete,
}: {
  plan: Plan;
  completingId: string | null;
  onComplete: (planId: string, milestoneId: string) => void;
}) {
  const status = STATUS_META[plan.status] ?? STATUS_META.active;
  const dl = daysLeft(plan.deadline);
  const completedCount = plan.milestones.filter((m) => m.completed).length;

  return (
    <Card hover className="p-5 flex flex-col animate-fade-in">
      {/* 标题区 */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-display font-bold text-ink-900 text-lg leading-snug flex-1">{plan.title}</h3>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>
      {plan.description && (
        <p className="text-sm text-ink-500 mb-3 line-clamp-2">{plan.description}</p>
      )}

      {/* 引擎标签 */}
      {plan.engines.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {plan.engines.map((e) => {
            const opt = ENGINE_OPTIONS.find((o) => o.value === e);
            const Icon = opt?.icon ?? Target;
            return (
              <span
                key={e}
                className={cn("lf-badge", opt?.color ?? "bg-ink-100 text-ink-600")}
              >
                <Icon className="w-3 h-3" /> {ENGINE_LABEL[e] ?? e}
              </span>
            );
          })}
        </div>
      )}

      {/* 进度 */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
          <span className="flex items-center gap-1">
            <ListChecks className="w-3.5 h-3.5" />
            里程碑 {completedCount}/{plan.milestones.length}
          </span>
          <span className="font-mono text-ink-700 font-medium">{Math.round(plan.progress * 100)}%</span>
        </div>
        <ProgressBar value={plan.progress} />
      </div>

      {/* 截止日期 */}
      <div className="flex items-center gap-2 text-xs text-ink-500 mb-3">
        <Calendar className="w-3.5 h-3.5" />
        <span>{fmtDate(plan.deadline)}</span>
        {dl !== null && dl >= 0 && plan.status === "active" && (
          <Badge variant={dl <= 3 ? "danger" : "default"}>
            剩余 {dl} 天
          </Badge>
        )}
        {dl !== null && dl < 0 && plan.status !== "completed" && (
          <Badge variant="danger">已逾期</Badge>
        )}
      </div>

      {/* 里程碑列表 */}
      <div className="border-t border-ink-100 pt-3 mt-auto">
        {plan.milestones.length === 0 ? (
          <div className="text-xs text-ink-400 text-center py-2">暂无里程碑</div>
        ) : (
          <div className="space-y-1.5">
            {plan.milestones
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((m) => {
                const isCompleting = completingId === `${plan.id}:${m.id}`;
                return (
                  <button
                    key={m.id}
                    onClick={() => !m.completed && !isCompleting && onComplete(plan.id, m.id)}
                    disabled={m.completed || isCompleting}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-all",
                      m.completed
                        ? "opacity-60 cursor-default"
                        : "hover:bg-brand-50 cursor-pointer",
                      isCompleting && "opacity-70"
                    )}
                  >
                    {m.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    ) : isCompleting ? (
                      <Loader2 className="w-4 h-4 text-brand-500 animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-ink-300 shrink-0" />
                    )}
                    <span className={cn(
                      "text-sm flex-1",
                      m.completed ? "text-ink-400 line-through" : "text-ink-700"
                    )}>
                      {m.title}
                    </span>
                    {m.target_date && (
                      <span className="text-xs text-ink-400 font-mono">
                        {fmtDate(m.target_date)}
                      </span>
                    )}
                  </button>
                );
              })}
          </div>
        )}
      </div>
    </Card>
  );
}

// ===== 新建计划弹窗 =====
function CreatePlanModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [engines, setEngines] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const toggleEngine = (v: string) => {
    setEngines((prev) => (prev.includes(v) ? prev.filter((e) => e !== v) : [...prev, v]));
  };

  const addMilestone = () => setMilestones((prev) => [...prev, ""]);
  const removeMilestone = (i: number) =>
    setMilestones((prev) => prev.filter((_, idx) => idx !== i));
  const updateMilestone = (i: number, v: string) =>
    setMilestones((prev) => prev.map((m, idx) => (idx === i ? v : m)));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("请填写计划标题");
      return;
    }
    setSubmitting(true);
    try {
      const validMilestones = milestones
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t, i) => ({ title: t, order_index: i }));
      await plansApi.create({
        title: title.trim(),
        description: description.trim(),
        deadline: deadline ? new Date(deadline).toISOString() : null,
        engines,
        milestones: validMilestones,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-cardhover animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Target className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="font-display font-bold text-ink-900">新建学习计划</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 标题 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">计划标题 <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="lf-input"
              placeholder="例如：掌握 React 性能优化"
              autoFocus
            />
          </div>

          {/* 描述 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">计划描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="lf-input min-h-[72px] resize-y"
              placeholder="简述计划目标与执行方式"
            />
          </div>

          {/* 截止日期 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">截止日期</label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="lf-input"
            />
          </div>

          {/* 引擎多选 */}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">学习引擎</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ENGINE_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const selected = engines.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleEngine(opt.value)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                      selected
                        ? "border-brand-400 bg-brand-50 text-brand-700 shadow-sm"
                        : "border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50"
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 里程碑 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-ink-700">里程碑</label>
              <button
                type="button"
                onClick={addMilestone}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> 添加
              </button>
            </div>
            <div className="space-y-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-ink-100 text-ink-500 text-xs font-mono flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={m}
                    onChange={(e) => updateMilestone(i, e.target.value)}
                    className="lf-input"
                    placeholder={`里程碑 ${i + 1} 标题`}
                  />
                  {milestones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMilestone(i)}
                      className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="lf-btn-secondary">
              取消
            </button>
            <button type="submit" disabled={submitting} className="lf-btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flame className="w-4 h-4" />}
              {submitting ? "创建中..." : "创建计划"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
