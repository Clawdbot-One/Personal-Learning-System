// AI 导师 — Manager-Workers 协同 · 五大学习引擎导师
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  MessageSquare, Compass, BookOpen, Zap, Clock, Brain, Target,
  LineChart, Gift, Send, Trash2, Sparkles, Bot, User as UserIcon,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Card, Badge, Loading } from "@/components/ui";
import { agentApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { AgentMessage, AgentChatResponse } from "@/types";

// Agent 名册
const AGENTS = [
  { type: "manager", name: "总指挥", icon: Compass, desc: "意图识别与任务编排", color: "text-brand-600 bg-brand-50" },
  { type: "reading_tutor", name: "阅读导师", icon: BookOpen, desc: "海绵阅读法 · 三层笔记", color: "text-gold-600 bg-gold-50" },
  { type: "practice_tutor", name: "练习导师", icon: Zap, desc: "刻意练习 · 自适应难度", color: "text-brand-600 bg-brand-50" },
  { type: "focus_tutor", name: "专注导师", icon: Clock, desc: "深度工作 · 番茄钟", color: "text-green-600 bg-green-50" },
  { type: "critical_tutor", name: "批判导师", icon: Brain, desc: "学会提问 · 谬误检测", color: "text-red-600 bg-red-50" },
  { type: "action_tutor", name: "行动导师", icon: Target, desc: "知行转化 · 费曼输出", color: "text-purple-600 bg-purple-50" },
  { type: "tracker", name: "进度追踪", icon: LineChart, desc: "学习数据 · 进度报告", color: "text-brand-600 bg-brand-50" },
  { type: "reward", name: "激励官", icon: Gift, desc: "跨学科奖励发放", color: "text-gold-600 bg-gold-50" },
];

const AGENT_NAME: Record<string, string> = Object.fromEntries(AGENTS.map((a) => [a.type, a.name]));

const AGENT_BADGE: Record<string, "brand" | "gold" | "success" | "danger" | "default"> = {
  manager: "brand",
  reading_tutor: "gold",
  practice_tutor: "brand",
  focus_tutor: "success",
  critical_tutor: "danger",
  action_tutor: "brand",
  tracker: "default",
  reward: "gold",
};

const QUICK_STARTS = [
  "帮我制定学习计划",
  "推荐一个练习题",
  "如何提高专注力？",
  "分析一段论证",
];

const WELCOME_TEXT =
  "你好！我是你的 AI 学习导师。可以问我关于学习计划、刻意练习、深度工作、阅读笔记、批判性思维或行动转化的问题。";

// 带建议扩展的消息类型
type ChatMessage = AgentMessage & { suggestions?: string[] };

function fmtTime(s?: string): string {
  if (!s) return "";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "" : d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
}

export default function Agent() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 加载历史
  useEffect(() => {
    agentApi
      .history(50)
      .then((h) => {
        setMessages(
          h.map((m) => ({
            ...m,
            suggestions: m.role === "assistant" ? (m.metadata?.suggestions as string[] | undefined) ?? [] : [],
          }))
        );
      })
      .catch(() => setError("加载历史失败"))
      .finally(() => setLoading(false));
  }, []);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // 最近一条 assistant 消息的 agent_type（用于高亮名册）
  const activeAgent = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i].agent_type;
    }
    return "manager";
  }, [messages]);

  // 最后一条 assistant 消息的索引（用于显示建议）
  const lastAssistantIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return i;
    }
    return -1;
  }, [messages]);

  const sendMessage = async (text: string) => {
    const content = text.trim();
    if (!content || sending) return;
    setError("");

    // 追加用户消息
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content,
      agent_type: "user",
      metadata: {},
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res: AgentChatResponse = await agentApi.chat(content, {});
      const assistantMsg: ChatMessage = {
        id: res.id,
        role: "assistant",
        content: res.content,
        agent_type: res.agent_type,
        metadata: { suggestions: res.suggestions, intent: res.intent },
        suggestions: res.suggestions,
        created_at: res.created_at,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "发送失败，请重试");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const handleClear = async () => {
    if (!confirm("确定清空所有对话历史？")) return;
    try {
      await agentApi.clear();
      setMessages([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "清空失败");
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-7.5rem)]">
        {/* 页头 */}
        <div className="flex items-center justify-between gap-3 mb-4 animate-slide-up shrink-0">
          <div>
            <h1 className="lf-page-title flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-brand-600" /> AI 导师
            </h1>
            <p className="lf-page-subtitle">Manager-Workers 协同 · 五大学习引擎导师</p>
          </div>
          {hasMessages && (
            <button onClick={handleClear} className="lf-btn-ghost text-sm">
              <Trash2 className="w-4 h-4" /> 清空历史
            </button>
          )}
        </div>

        {/* 主体：名册 + 聊天 */}
        <div className="flex flex-1 min-h-0 gap-4">
          {/* 左侧 Agent 名册 */}
          <aside className="hidden md:flex flex-col w-56 shrink-0">
            <Card className="p-3 flex-1 overflow-y-auto">
              <div className="text-xs font-semibold text-ink-400 uppercase tracking-wider px-1 mb-2">导师团队</div>
              <div className="space-y-1">
                {AGENTS.map((a) => {
                  const Icon = a.icon;
                  const active = activeAgent === a.type;
                  return (
                    <div
                      key={a.type}
                      className={cn(
                        "flex items-start gap-2.5 p-2 rounded-lg transition-all",
                        active ? "bg-brand-50 ring-1 ring-brand-200" : "hover:bg-ink-50"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", a.color)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-semibold text-ink-800">{a.name}</span>
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-soft" />}
                        </div>
                        <div className="text-[11px] text-ink-400 leading-tight">{a.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </aside>

          {/* 聊天区 */}
          <Card className="flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {loading ? (
                <Loading text="正在加载对话历史..." />
              ) : !hasMessages ? (
                <WelcomeView onPick={sendMessage} />
              ) : (
                messages.map((m, idx) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    showSuggestions={idx === lastAssistantIndex && (m.suggestions?.length ?? 0) > 0}
                    onSuggestionClick={sendMessage}
                  />
                ))
              )}

              {/* 正在输入指示器 */}
              {sending && (
                <div className="flex items-start gap-2.5 animate-fade-in">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-brand-600" />
                  </div>
                  <div className="bg-white border border-ink-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-card">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 rounded-full bg-ink-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-xs text-red-600 text-center px-3 py-2 bg-red-50 rounded-lg">{error}</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区 */}
            <div className="border-t border-ink-100 p-3 sm:p-4 shrink-0 bg-white">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    disabled={sending}
                    placeholder="输入消息，Enter 发送，Shift+Enter 换行..."
                    className="lf-input resize-none max-h-32 pr-2 leading-relaxed"
                    style={{ minHeight: "44px" }}
                  />
                </div>
                <button
                  onClick={() => sendMessage(input)}
                  disabled={sending || !input.trim()}
                  className="lf-btn-primary h-[44px] px-4"
                  title="发送 (Enter)"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

// ===== 欢迎视图 =====
function WelcomeView({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center py-8 animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-cardhover mb-4">
        <Sparkles className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-xl font-bold font-display text-ink-900 mb-2">AI 学习导师已就绪</h3>
      <p className="text-sm text-ink-500 max-w-md mb-6 leading-relaxed">{WELCOME_TEXT}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {QUICK_STARTS.map((q) => (
          <button
            key={q}
            onClick={() => onPick(q)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl border border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/50 hover:shadow-card transition-all text-left text-sm text-ink-700 group"
          >
            <Sparkles className="w-4 h-4 text-brand-500 shrink-0 group-hover:scale-110 transition-transform" />
            <span className="flex-1">{q}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ===== 消息气泡 =====
function MessageBubble({
  message, showSuggestions, onSuggestionClick,
}: {
  message: ChatMessage;
  showSuggestions: boolean;
  onSuggestionClick: (text: string) => void;
}) {
  const isUser = message.role === "user";
  const agentName = AGENT_NAME[message.agent_type] ?? "AI 导师";

  if (isUser) {
    return (
      <div className="flex items-start gap-2.5 justify-end animate-fade-in">
        <div className="flex flex-col items-end max-w-[80%]">
          <div className="bg-brand-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-card">
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <span className="text-[10px] text-ink-400 mt-1 font-mono">{fmtTime(message.created_at)}</span>
        </div>
        <div className="w-8 h-8 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
          <UserIcon className="w-4 h-4 text-brand-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 animate-fade-in">
      <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-brand-600" />
      </div>
      <div className="flex flex-col items-start max-w-[80%]">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant={AGENT_BADGE[message.agent_type] ?? "default"}>{agentName}</Badge>
          <span className="text-[10px] text-ink-400 font-mono">{fmtTime(message.created_at)}</span>
        </div>
        <div className="bg-white border border-ink-200 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-card">
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words text-ink-800">{message.content}</p>
        </div>
        {showSuggestions && message.suggestions && message.suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onSuggestionClick(s)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-brand-50 text-brand-700 text-xs font-medium border border-brand-200 hover:bg-brand-100 hover:border-brand-300 transition-all"
              >
                <Sparkles className="w-3 h-3" /> {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
