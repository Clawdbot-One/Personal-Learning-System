/**
 * AI 导师对话 —— 融合五大学习方法论
 * 刻意练习 / 海绵阅读 / 深度工作 / 知行转化 / 批判思维
 */
import { useEffect, useRef, useState } from 'react'
import { Bot, Send, Loader2, Sparkles, BookOpen } from 'lucide-react'
import { EngineTag } from '@/components/ui'
import { agentApi } from '@/lib/api'
import { toast } from '@/store/auth'
import type { AgentMessage } from '@/lib/types'

type EngineInfo = { name: string; book: string; principles: string[]; methods: { name: string; detail: string }[] }

const RECOMMEND = ['如何高效练习编程？', '怎么读书才能记住？', '如何保持专注？', '怎样把学到的知识用起来？']

/** 简易 markdown 渲染：**粗体** → <strong>，换行 → 多段 */
function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    const parts = line.split('**')
    return (
      <p key={i} className={i > 0 ? 'mt-2' : ''}>
        {parts.map((p, j) =>
          j % 2 === 1
            ? <strong key={j} className="font-semibold text-ink-900">{p}</strong>
            : <span key={j}>{p}</span>
        )}
      </p>
    )
  })
}

export default function Agent() {
  const [engines, setEngines] = useState<Record<string, EngineInfo>>({})
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    agentApi.engines().then(setEngines).catch(() => {})
    agentApi.messages()
      .then(setMessages)
      .catch((e) => toast((e as Error).message, 'error'))
      .finally(() => setLoadingMsgs(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')
    const userMsg: AgentMessage = {
      id: `temp-${Date.now()}`, role: 'user', content: trimmed,
      engine_type: '', metadata: {}, created_at: new Date().toISOString(),
    }
    setMessages((m) => [...m, userMsg])
    setSending(true)
    try {
      const { data, reward } = await agentApi.chat(trimmed)
      setMessages((m) => [...m, data])
      if (reward && reward.total > 0) toast(`获得 ${reward.total} 积分`, 'reward')
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const engineList = Object.entries(engines)

  return (
    <div className="flex gap-4 h-[calc(100vh-6rem)] lg:h-[calc(100vh-7rem)] animate-fade-in">
      {/* 侧边栏：五大引擎 */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col gap-3 overflow-y-auto pr-1">
        <div className="flex items-center gap-2 px-1">
          <Sparkles size={16} className="text-brand-600" />
          <span className="text-sm font-semibold text-ink-900">五大学习引擎</span>
        </div>
        {engineList.length === 0 ? (
          <div className="lf-card p-4 text-xs text-ink-400">加载中…</div>
        ) : engineList.map(([key, info]) => (
          <button
            key={key}
            onClick={() => send(`请基于《${info.book}》介绍「${info.name}」的核心方法，并给我一些可操作建议。`)}
            className="lf-card p-3.5 text-left hover:border-brand-300 hover:shadow-cardHover group"
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <EngineTag engine={key} size="sm" />
              <span className="text-[10px] text-ink-400">{info.methods.length} 个方法</span>
            </div>
            <div className="text-sm font-semibold text-ink-900 group-hover:text-brand-700">{info.name}</div>
            <div className="text-xs text-ink-500 flex items-center gap-1 mt-0.5">
              <BookOpen size={11} /> {info.book}
            </div>
            {info.principles[0] && (
              <p className="text-[11px] text-ink-400 mt-1.5 line-clamp-2">{info.principles[0]}</p>
            )}
          </button>
        ))}
      </aside>

      {/* 主对话区 */}
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <div className="h-14 px-4 flex items-center gap-2 border-b border-ink-200 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-600 to-brand-400 flex items-center justify-center">
            <Bot size={18} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink-900">AI 学习导师</div>
            <div className="text-[11px] text-ink-400">融合五大学习方法论 · 智能辅导</div>
          </div>
        </div>

        {/* 消息列表 */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {loadingMsgs ? (
            <div className="flex items-center justify-center h-full text-sm text-ink-400">
              <Loader2 size={18} className="animate-spin mr-2" /> 加载对话记录…
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mb-3">
                <Bot size={26} className="text-brand-600" />
              </div>
              <h3 className="text-lg font-semibold text-ink-900 mb-1">你好，我是你的 AI 学习导师</h3>
              <p className="text-sm text-ink-500 max-w-md mb-5">
                我融合了刻意练习、海绵阅读、深度工作、知行转化与批判思维五大方法论，随时为你解答学习难题。
              </p>
              <div className="grid sm:grid-cols-2 gap-2 w-full max-w-lg">
                {RECOMMEND.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="lf-card p-3 text-left text-sm text-ink-700 hover:border-brand-300 hover:text-brand-700"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] ${m.role === 'user' ? '' : 'flex flex-col gap-1.5'}`}>
                    {m.role === 'assistant' && m.engine_type && (
                      <EngineTag engine={m.engine_type} size="sm" />
                    )}
                    <div
                      className={`px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-brand-600 text-white rounded-2xl rounded-br-md'
                          : 'bg-ink-50 text-ink-800 rounded-2xl rounded-bl-md lf-markdown'
                      }`}
                    >
                      {m.role === 'user' ? m.content : renderContent(m.content)}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-ink-50 text-ink-500 rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> 思考中…
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-ink-200 p-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder="向 AI 导师提问…（回车发送，Shift+回车换行）"
              className="lf-input resize-none max-h-32 flex-1 !py-2 leading-6"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || sending}
              className="lf-btn-primary !py-2.5 shrink-0"
            >
              {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
