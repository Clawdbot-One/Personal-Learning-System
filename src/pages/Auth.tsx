// 登录 / 注册页 — 分屏设计
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Zap, BookOpen, Clock, Brain, Network, Target, Sparkles, Loader2, AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

type Tab = "login" | "register";

const FEATURES = [
  { icon: Zap, title: "刻意练习", desc: "学习区难度自适应，精准突破能力瓶颈" },
  { icon: BookOpen, title: "海绵阅读", desc: "三层笔记法，把信息提炼成结构化知识" },
  { icon: Network, title: "知识图谱", desc: "节点互联，构建属于你自己的认知网络" },
];

const ENGINES = [Target, Clock, Brain, Sparkles];

export default function Auth() {
  const navigate = useNavigate();
  const { user, token, loading, login, register } = useAuthStore();

  const [tab, setTab] = useState<Tab>("login");
  const [error, setError] = useState("");

  // 登录表单
  const [account, setAccount] = useState("");
  const [password, setPassword] = useState("");

  // 注册表单
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");

  // 已登录则跳转
  if (token && user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(account, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "登录失败，请重试");
    }
  };

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (regPassword.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    try {
      await register(username, email, regPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "注册失败，请重试");
    }
  };

  const fillDemo = () => {
    setAccount("demo");
    setPassword("demo123456");
    setTab("login");
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-ink-50">
      {/* 左侧品牌区 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-ink-900 via-ink-900 to-brand-900">
        {/* 装饰网格 */}
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* 渐变光晕 */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-96 h-96 rounded-full bg-gold-500/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50">
              <span className="font-display font-bold text-xl">L</span>
            </div>
            <div>
              <div className="font-display font-bold text-xl leading-none">LearnFlow</div>
              <div className="text-[11px] text-white/50 font-mono tracking-[0.2em] mt-1">AI LEARNING SYSTEM</div>
            </div>
          </div>

          {/* 主标语 */}
          <div className="max-w-md">
            <h1 className="font-display text-4xl xl:text-5xl font-bold leading-tight mb-4">
              让每一次学习
              <br />
              <span className="bg-gradient-to-r from-brand-300 to-gold-300 bg-clip-text text-transparent">
                都有迹可循
              </span>
            </h1>
            <p className="text-white/70 text-base leading-relaxed">
              AI 驱动的个人学习辅助系统，融合五大学习引擎，
              以刻意练习与深度工作为方法论，打造你的专属成长飞轮。
            </p>

            {/* 特性列表 */}
            <div className="mt-10 space-y-5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div key={f.title} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center shrink-0 backdrop-blur-sm">
                      <Icon className="w-5 h-5 text-brand-200" />
                    </div>
                    <div>
                      <div className="font-semibold text-white">{f.title}</div>
                      <div className="text-sm text-white/60 mt-0.5">{f.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部引擎图标 */}
          <div className="flex items-center gap-3 text-white/40">
            {ENGINES.map((Icon, i) => (
              <Icon key={i} className="w-4 h-4" />
            ))}
            <span className="text-xs font-mono tracking-wider ml-1">FIVE ENGINES · ONE SYSTEM</span>
          </div>
        </div>
      </div>

      {/* 右侧表单区 */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md animate-slide-up">
          {/* 移动端 Logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold font-display text-lg">L</span>
            </div>
            <span className="font-display font-bold text-xl text-ink-900">LearnFlow</span>
          </div>

          <div className="lf-card p-7 sm:p-8 shadow-cardhover">
            <h2 className="font-display text-2xl font-bold text-ink-900">
              {tab === "login" ? "欢迎回来" : "创建账户"}
            </h2>
            <p className="text-sm text-ink-500 mt-1">
              {tab === "login" ? "登录开启今日学习" : "注册后即可开启学习之旅"}
            </p>

            {/* Tab 切换 */}
            <div className="mt-6 grid grid-cols-2 gap-1 p-1 bg-ink-100 rounded-lg">
              {(["login", "register"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(""); }}
                  className={cn(
                    "py-2 rounded-md text-sm font-medium transition-all duration-200",
                    tab === t
                      ? "bg-white text-ink-900 shadow-sm"
                      : "text-ink-500 hover:text-ink-700"
                  )}
                >
                  {t === "login" ? "登录" : "注册"}
                </button>
              ))}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 animate-fade-in">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 登录表单 */}
            {tab === "login" ? (
              <form onSubmit={handleLogin} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">用户名 / 邮箱</label>
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    className="lf-input"
                    placeholder="输入用户名或邮箱"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">密码</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="lf-input"
                    placeholder="输入密码"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="lf-btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "登录中..." : "登录"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">用户名</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="lf-input"
                    placeholder="设置用户名"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="lf-input"
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 mb-1.5">密码</label>
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="lf-input"
                    placeholder="至少 6 位"
                    autoComplete="new-password"
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="lf-btn-primary w-full">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {loading ? "注册中..." : "创建账户"}
                </button>
              </form>
            )}

            {/* Demo 提示 */}
            <div className="mt-5 p-3 rounded-lg bg-brand-50/60 border border-brand-100">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-brand-700 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> 演示账号
                  </div>
                  <div className="text-xs text-ink-500 mt-0.5 font-mono">demo / demo123456</div>
                </div>
                <button onClick={fillDemo} className="lf-btn-ghost text-xs px-2.5 py-1.5 shrink-0">
                  一键填入
                </button>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-ink-400 mt-6">
            登录即代表你同意 LearnFlow 的服务条款与隐私政策
          </p>
        </div>
      </div>
    </div>
  );
}
