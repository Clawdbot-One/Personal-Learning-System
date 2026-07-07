/**
 * LearnFlow 共享 UI 组件
 */
import { type ReactNode } from 'react'
import { type LucideIcon } from 'lucide-react'

/** 卡片容器 */
export function Card({ children, className = '', hover = true }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`lf-card p-5 ${hover ? '' : 'hover:shadow-card'} ${className}`}>{children}</div>
}

/** 统计数字卡 */
export function StatCard({ icon: Icon, label, value, sub, color = 'brand' }: { icon: LucideIcon; label: string; value: ReactNode; sub?: string; color?: 'brand' | 'gold' | 'green' | 'purple' }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    gold: 'bg-gold-50 text-gold-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="lf-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-ink-900 leading-tight">{value}</div>
        <div className="text-sm text-ink-500">{label}</div>
        {sub && <div className="text-xs text-ink-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  )
}

/** 进度条 */
export function ProgressBar({ value, max = 100, color = 'brand', height = 'h-2' }: { value: number; max?: number; color?: 'brand' | 'gold' | 'green'; height?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const colorMap = { brand: 'bg-brand-500', gold: 'bg-gold-500', green: 'bg-emerald-500' }
  return (
    <div className={`w-full ${height} bg-ink-100 rounded-full overflow-hidden`}>
      <div className={`${height} ${colorMap[color]} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** 圆环进度 */
export function ProgressRing({ value, size = 64, stroke = 6, color = '#2563eb', label }: { value: number; size?: number; stroke?: number; color?: string; label?: string }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(100, value) / 100) * circumference
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e2e5ea" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-ink-900">{Math.round(value)}%</span>
        {label && <span className="text-[10px] text-ink-400">{label}</span>}
      </div>
    </div>
  )
}

/** 空状态 */
export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-ink-100 flex items-center justify-center mb-4">
        <Icon size={28} className="text-ink-400" />
      </div>
      <h3 className="text-lg font-semibold text-ink-800 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-500 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  )
}

/** 页面标题 */
export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between mb-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

/** 引擎标签 */
export function EngineTag({ engine, size = 'sm' }: { engine: string; size?: 'sm' | 'md' }) {
  const labels: Record<string, { label: string; color: string; bg: string }> = {
    deliberate_practice: { label: '刻意练习', color: '#7c3aed', bg: '#ede9fe' },
    sponge_reading: { label: '海绵阅读', color: '#db2777', bg: '#fce7f3' },
    deep_work: { label: '深度工作', color: '#059669', bg: '#d1fae5' },
    knowledge_action: { label: '知行转化', color: '#d97706', bg: '#fef3c7' },
    critical_thinking: { label: '批判思维', color: '#0891b2', bg: '#cffafe' },
    reading: { label: '海绵阅读', color: '#db2777', bg: '#fce7f3' },
  }
  const info = labels[engine] || { label: engine, color: '#6b7280', bg: '#f1f3f7' }
  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md font-medium ${sizeCls}`} style={{ color: info.color, background: info.bg }}>
      {info.label}
    </span>
  )
}

/** 模态框 */
export function Modal({ open, onClose, title, children, maxWidth = 'max-w-lg' }: { open: boolean; onClose: () => void; title: string; children: ReactNode; maxWidth?: string }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm" />
      <div className={`relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl animate-scale-in`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-200">
          <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="lf-btn-ghost !p-1.5 !rounded-lg">
            <span className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}

/** 加载骨架 */
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-ink-100 rounded-lg ${className}`} />
}
