// 主布局：侧边栏 + 顶部栏 + 内容区
import { type ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Target, Brain, Clock, BookOpen,
  Trophy, MessageSquare, Network, Zap, LogOut, Menu, X, Flame,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/dashboard", label: "仪表盘", icon: LayoutDashboard },
  { to: "/plans", label: "学习计划", icon: Target },
  { to: "/practice", label: "刻意练习", icon: Zap },
  { to: "/reader", label: "海绵阅读", icon: BookOpen },
  { to: "/deep-work", label: "深度工作", icon: Clock },
  { to: "/knowledge", label: "知识图谱", icon: Network },
  { to: "/critical", label: "批判思维", icon: Brain },
  { to: "/rewards", label: "奖励中心", icon: Trophy },
  { to: "/agent", label: "AI 导师", icon: MessageSquare },
];

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-ink-200">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-sm">
          <span className="text-white font-bold font-display text-lg">L</span>
        </div>
        <div>
          <div className="font-display font-bold text-ink-900 leading-none">LearnFlow</div>
          <div className="text-[10px] text-ink-400 font-mono tracking-wider mt-0.5">AI LEARNING</div>
        </div>
      </div>

      {/* 导航 */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                )
              }
            >
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* 用户信息 */}
      <div className="border-t border-ink-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {user?.username?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-ink-900 truncate">{user?.username}</div>
            <div className="text-xs text-ink-400 flex items-center gap-1">
              <span>{user?.level_icon}</span>
              <span>{user?.level_name}</span>
              <span className="mx-0.5">·</span>
              <Flame className="w-3 h-3 text-gold-500" />
              <span>{user?.streak_days}天</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            title="退出登录"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-ink-50">
      {/* 桌面侧边栏 */}
      <aside className="w-64 bg-white border-r border-ink-200 hidden lg:block shrink-0">
        <SidebarContent />
      </aside>

      {/* 移动端侧边栏 */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 bg-ink-900/40 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-ink-200 z-50 lg:hidden animate-fade-in">
            <SidebarContent />
          </aside>
        </>
      )}

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 移动端顶栏 */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 bg-white border-b border-ink-200">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2 rounded-lg hover:bg-ink-100">
            <Menu className="w-5 h-5 text-ink-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-display font-bold text-ink-900">LearnFlow</span>
          </div>
          <div className="w-9" />
        </header>

        {/* 页面内容 */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* 移动端关闭按钮 */}
      {mobileOpen && (
        <button
          onClick={() => setMobileOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 rounded-lg bg-white shadow-card"
        >
          <X className="w-5 h-5 text-ink-700" />
        </button>
      )}
    </div>
  );
}
