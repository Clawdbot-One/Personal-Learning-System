/**
 * 学习计划页 —— 融合刻意练习引擎的技能分解方法论
 * 将目标拆解为可执行里程碑，点击卡片展开可逐个勾选完成
 */
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import {
  Target, Plus, Calendar, CheckCircle2, Circle, Trash2, ChevronDown, Award, Loader2,
} from 'lucide-react'
import { plansApi } from '@/lib/api'
import { useAuthStore, toast } from '@/store/auth'
import type { LearningPlan, Milestone } from '@/lib/types'
import { Card, ProgressBar, EmptyState, PageHeader, Modal, Skeleton } from '@/components/ui'

const CATEGORY_LABELS: Record<string, string> = {
  general: '通用', programming: '编程', language: '语言', science: '科学', other: '其他',
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  active: { label: '进行中', cls: 'bg-brand-50 text-brand-600' },
  completed: { label: '已完成', cls: 'bg-emerald-50 text-emerald-600' },
  archived: { label: '已归档', cls: 'bg-ink-100 text-ink-500' },
}

const SKILL_LEVELS: { value: string; label: string }[] = [
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '精通' },
]

interface FormState {
  title: string
  description: string
  category: string
  deadline: string
  target_skills: { name: string; level: string }[]
}

const EMPTY_FORM: FormState = {
  title: '', description: '', category: 'general', deadline: '', target_skills: [],
}

export default function Plans() {
  const { refreshUser } = useAuthStore()
  const [plans, setPlans] = useState<LearningPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => { loadPlans() }, [])

  async function loadPlans() {
    setLoading(true)
    try {
      setPlans(await plansApi.list())
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  function toggleExpand(id: string) {
    setExpandedId((cur) => (cur === id ? null : id))
  }

  async function handleToggleMilestone(plan: LearningPlan, m: Milestone) {
    const next = m.status === 'completed' ? 'pending' : 'completed'
    setTogglingId(m.id)
    try {
      const updated = await plansApi.toggleMilestone(plan.id, m.id, next)
      setPlans((cur) => cur.map((p) => (p.id === plan.id ? updated : p)))
      if (next === 'completed') {
        toast('里程碑完成，获得积分！', 'reward')
        refreshUser()
      }
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setTogglingId(null)
    }
  }

  async function handleDelete(plan: LearningPlan) {
    if (!window.confirm(`确定删除计划「${plan.title}」吗？此操作不可恢复。`)) return
    try {
      await plansApi.remove(plan.id)
      setPlans((cur) => cur.filter((p) => p.id !== plan.id))
      if (expandedId === plan.id) setExpandedId(null)
      toast('计划已删除', 'info')
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  function addSkill() {
    setForm((f) => ({ ...f, target_skills: [...f.target_skills, { name: '', level: 'beginner' }] }))
  }
  function updateSkill(idx: number, patch: Partial<{ name: string; level: string }>) {
    setForm((f) => ({ ...f, target_skills: f.target_skills.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }))
  }
  function removeSkill(idx: number) {
    setForm((f) => ({ ...f, target_skills: f.target_skills.filter((_, i) => i !== idx) }))
  }

  async function handleSubmit() {
    if (!form.title.trim()) { toast('请输入计划标题', 'error'); return }
    setSubmitting(true)
    try {
      const created = await plansApi.create({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        deadline: form.deadline || undefined,
        target_skills: form.target_skills.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), level: s.level })),
      })
      setPlans((cur) => [created, ...cur])
      setModalOpen(false)
      setForm(EMPTY_FORM)
      toast('计划已创建，已自动生成里程碑', 'success')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="学习计划"
        subtitle="将目标拆解为可执行的里程碑，按刻意练习路径稳步推进"
        action={<button className="lf-btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> 新建计划</button>}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Target}
          title="还没有学习计划"
          description="创建你的第一个学习计划，系统会按刻意练习方法自动拆解为可执行的里程碑"
          action={<button className="lf-btn-primary mt-2" onClick={() => setModalOpen(true)}><Plus size={16} /> 新建计划</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              expanded={expandedId === plan.id}
              togglingId={togglingId}
              onToggleExpand={() => toggleExpand(plan.id)}
              onToggleMilestone={(m) => handleToggleMilestone(plan, m)}
              onDelete={() => handleDelete(plan)}
            />
          ))}
        </div>
      )}

      <CreatePlanModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        form={form}
        setForm={setForm}
        submitting={submitting}
        onSubmit={handleSubmit}
        onAddSkill={addSkill}
        onUpdateSkill={updateSkill}
        onRemoveSkill={removeSkill}
      />
    </div>
  )
}

/** 计划卡片：展示概要信息，点击展开后渲染里程碑列表 */
function PlanCard({
  plan, expanded, togglingId, onToggleExpand, onToggleMilestone, onDelete,
}: {
  plan: LearningPlan
  expanded: boolean
  togglingId: string | null
  onToggleExpand: () => void
  onToggleMilestone: (m: Milestone) => void
  onDelete: () => void
}) {
  const status = STATUS_META[plan.status] || STATUS_META.active
  const deadline = plan.deadline ? new Date(plan.deadline).toLocaleDateString('zh-CN') : null
  const daysLeft = plan.deadline ? Math.ceil((new Date(plan.deadline).getTime() - Date.now()) / 86400000) : null

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 cursor-pointer" onClick={onToggleExpand}>
          <ChevronDown size={18} className={`text-ink-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`} />
          <h3 className="font-semibold text-ink-900 truncate">{plan.title}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`lf-badge ${status.cls}`}>{status.label}</span>
          <button className="lf-btn-ghost !p-1.5" onClick={onDelete} title="删除计划">
            <Trash2 size={15} className="text-ink-400 hover:text-red-500" />
          </button>
        </div>
      </div>

      {plan.description && <p className="text-sm text-ink-500 line-clamp-2">{plan.description}</p>}

      <div className="cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
          <span>进度 {plan.progress}%</span>
          <span className="flex items-center gap-1"><CheckCircle2 size={12} /> {plan.milestone_done}/{plan.milestone_total} 里程碑</span>
        </div>
        <ProgressBar value={plan.progress} color={plan.status === 'completed' ? 'green' : 'brand'} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {plan.target_skills?.map((s, i) => (
          <span key={i} className="lf-badge bg-gold-50 text-gold-700">
            <Target size={11} /> {s.name}{s.level ? ` · ${s.level}` : ''}
          </span>
        ))}
        {deadline && (
          <span className="lf-badge bg-ink-100 text-ink-600">
            <Calendar size={11} /> {deadline}
            {daysLeft !== null && daysLeft >= 0 && plan.status === 'active' && (
              <span className="ml-1 text-ink-400">还剩 {daysLeft} 天</span>
            )}
          </span>
        )}
      </div>

      {expanded && (
        <div className="border-t border-ink-100 pt-3 mt-1 space-y-1">
          <div className="flex items-center gap-1.5 text-xs font-medium text-ink-500 mb-1">
            <Award size={13} className="text-gold-500" /> 里程碑路径
          </div>
          {plan.milestones?.length ? (
            plan.milestones.map((m) => {
              const done = m.status === 'completed'
              const busy = togglingId === m.id
              return (
                <button
                  key={m.id}
                  onClick={() => onToggleMilestone(m)}
                  disabled={busy}
                  className="w-full flex items-start gap-2 text-left p-2 rounded-lg hover:bg-ink-50 transition-colors disabled:opacity-60"
                >
                  {done ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    : <Circle size={16} className="text-ink-300 shrink-0 mt-0.5" />}
                  <span className="min-w-0">
                    <span className={`block text-sm text-ink-800 ${done ? 'line-through text-ink-400' : ''}`}>{m.title}</span>
                    {m.description && <span className="block text-xs text-ink-400 mt-0.5">{m.description}</span>}
                  </span>
                </button>
              )
            })
          ) : (
            <p className="text-xs text-ink-400 text-center py-2">暂无里程碑</p>
          )}
        </div>
      )}
    </Card>
  )
}

/** 新建计划模态框：表单含标题、描述、分类、截止日期与可动态增减的目标技能 */
function CreatePlanModal({
  open, onClose, form, setForm, submitting, onSubmit, onAddSkill, onUpdateSkill, onRemoveSkill,
}: {
  open: boolean
  onClose: () => void
  form: FormState
  setForm: Dispatch<SetStateAction<FormState>>
  submitting: boolean
  onSubmit: () => void
  onAddSkill: () => void
  onUpdateSkill: (idx: number, patch: Partial<{ name: string; level: string }>) => void
  onRemoveSkill: (idx: number) => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="新建学习计划" maxWidth="max-w-xl">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">标题 <span className="text-red-500">*</span></label>
          <input
            className="lf-input"
            placeholder="例如：30 天掌握 React Hooks"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-700 mb-1.5">描述</label>
          <textarea
            className="lf-input min-h-[80px] resize-y"
            placeholder="说明计划目标与背景（可选）"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">分类</label>
            <select
              className="lf-input"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            >
              {Object.entries(CATEGORY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">截止日期</label>
            <input
              type="date"
              className="lf-input"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium text-ink-700">目标技能</label>
            <button className="lf-btn-ghost !py-1 !px-2 text-xs" onClick={onAddSkill}><Plus size={13} /> 添加技能</button>
          </div>
          <p className="text-xs text-ink-400 mb-2">系统将按刻意练习方法为每个技能拆解出递进的里程碑</p>
          <div className="space-y-2">
            {form.target_skills.length === 0 && (
              <p className="text-xs text-ink-400 italic">未添加技能，将按通用路径生成里程碑</p>
            )}
            {form.target_skills.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="lf-input flex-1"
                  placeholder="技能名称，如 TypeScript"
                  value={s.name}
                  onChange={(e) => onUpdateSkill(i, { name: e.target.value })}
                />
                <select
                  className="lf-input w-32"
                  value={s.level}
                  onChange={(e) => onUpdateSkill(i, { level: e.target.value })}
                >
                  {SKILL_LEVELS.map((lv) => <option key={lv.value} value={lv.value}>{lv.label}</option>)}
                </select>
                <button className="lf-btn-ghost !p-2" onClick={() => onRemoveSkill(i)}>
                  <Trash2 size={14} className="text-ink-400 hover:text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-brand-50 text-brand-700 text-xs">
          <Award size={14} />
          创建后系统会自动为该计划生成可勾选的里程碑节点
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button className="lf-btn-secondary" onClick={onClose} disabled={submitting}>取消</button>
          <button className="lf-btn-primary" onClick={onSubmit} disabled={submitting}>
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            创建计划
          </button>
        </div>
      </div>
    </Modal>
  )
}
