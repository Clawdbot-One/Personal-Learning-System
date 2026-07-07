// 共享 UI 组件
import { type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function Loading({ text = "加载中..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-ink-400">
      <Loader2 className="w-6 h-6 animate-spin mb-2 text-brand-500" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="text-ink-300 mb-3">{icon}</div>}
      <h3 className="text-base font-semibold text-ink-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-400 max-w-sm mb-4">{description}</p>}
      {action}
    </div>
  );
}

export function Card({
  children,
  className,
  hover,
}: {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return <div className={cn("lf-card", hover && "lf-card-hover", className)}>{children}</div>;
}

export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "brand" | "gold" | "success" | "danger";
}) {
  const variants = {
    default: "bg-ink-100 text-ink-600",
    brand: "bg-brand-50 text-brand-700",
    gold: "bg-gold-50 text-gold-700",
    success: "bg-green-50 text-green-700",
    danger: "bg-red-50 text-red-700",
  };
  return <span className={cn("lf-badge", variants[variant])}>{children}</span>;
}

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("h-2 bg-ink-100 rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-brand-600 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value * 100))}%` }}
      />
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
  accent = "brand",
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  hint?: string;
  accent?: "brand" | "gold" | "success" | "danger";
}) {
  const accents = {
    brand: "text-brand-600 bg-brand-50",
    gold: "text-gold-600 bg-gold-50",
    success: "text-green-600 bg-green-50",
    danger: "text-red-600 bg-red-50",
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", accents[accent])}>
          {icon}
        </div>
        {hint && <span className="text-xs text-ink-400 font-mono">{hint}</span>}
      </div>
      <div className="text-2xl font-bold font-display text-ink-900">{value}</div>
      <div className="text-sm text-ink-500 mt-0.5">{label}</div>
    </Card>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        <h2 className="text-lg font-bold text-ink-900 font-display">{title}</h2>
        {subtitle && <p className="text-sm text-ink-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
