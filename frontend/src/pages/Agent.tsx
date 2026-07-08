import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layout,
  Button,
  Input,
  Spin,
  Empty,
  Typography,
  Space,
  Tag,
  Select,
  Avatar,
  App,
  Alert,
  Tooltip,
} from 'antd'
import { PlusOutlined, SendOutlined, RobotOutlined, UserOutlined, MessageOutlined } from '@ant-design/icons'
import { api } from '../api/client'
import type { AgentMessageOut, ConversationOut } from '../api/types'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Sider, Content } = Layout

const ROLES = [
  { value: 'planner', label: '规划师' },
  { value: 'reading', label: '阅读指导' },
  { value: 'practice', label: '练习教练' },
  { value: 'focus', label: '专注顾问' },
  { value: 'thinking', label: '思维导师' },
  { value: 'action', label: '行动教练' },
]

function roleLabel(role: string): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function backendTag(meta: Record<string, unknown>): React.ReactNode {
  const backend = String(meta?.backend ?? '')
  if (backend === 'llm') return <Tag color="geekblue">大模型</Tag>
  if (backend === 'rule') return <Tag color="default">规则</Tag>
  return null
}

export default function Agent() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [role, setRole] = useState<string>('planner')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<AgentMessageOut[]>([])
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations'],
    queryFn: api.listConversations,
  })

  // when switching conversation, load its messages from the list
  useEffect(() => {
    if (selectedId) {
      const conv = conversations?.find((c) => c.id === selectedId)
      setMessages(conv?.messages ?? [])
    } else {
      setMessages([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    const now = new Date().toISOString()
    const userMsg: AgentMessageOut = {
      id: `tmp-u-${Date.now()}`,
      role: 'user',
      content: text,
      meta: {},
      created_at: now,
    }
    setMessages((prev) => [...prev, userMsg])
    setSending(true)
    try {
      const res = await api.agentChat({
        message: text,
        role,
        conversation_id: selectedId ?? undefined,
      })
      const assistantMsg: AgentMessageOut = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.content,
        meta: { backend: res.backend, ...res.meta },
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, assistantMsg])
      if (!selectedId) setSelectedId(res.conversation_id)
      qc.invalidateQueries({ queryKey: ['conversations'] })
    } catch {
      message.error('发送失败，请稍后重试')
    } finally {
      setSending(false)
    }
  }

  function newConversation() {
    setSelectedId(null)
    setMessages([])
    setInput('')
  }

  return (
    <div className="lf-page" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <Title level={3} style={{ marginBottom: 16 }}>
        AI 助手
      </Title>

      <Alert
        type="info"
        showIcon
        icon={<RobotOutlined />}
        message="AI 助手采用 Manager-Workers 架构，6 个专家角色协同。配置 LLM 后使用大模型，否则使用规则引擎（始终可用）。"
        style={{ marginBottom: 16 }}
      />

      <Layout style={{ flex: 1, minHeight: 0, background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <Sider width={264} theme="light" style={{ borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <div style={{ padding: 12 }}>
            <Button type="primary" icon={<PlusOutlined />} block onClick={newConversation}>
              新对话
            </Button>
          </div>
          <div style={{ borderTop: '1px solid #f5f5f5' }}>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
            ) : (conversations ?? []).length === 0 ? (
              <Empty description="暂无对话" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 24 }} />
            ) : (
              conversations?.map((c) => (
                <ConversationItem
                  key={c.id}
                  conv={c}
                  active={c.id === selectedId}
                  onClick={() => setSelectedId(c.id)}
                />
              ))
            )}
          </div>
        </Sider>

        <Content style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* role selector bar */}
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Space size={6}>
              <RobotOutlined style={{ color: '#2563eb' }} />
              <Text type="secondary">专家角色</Text>
            </Space>
            <Select
              size="middle"
              value={role}
              onChange={setRole}
              style={{ width: 160 }}
              options={ROLES}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedId ? `当前对话 · ${roleLabel(role)}` : '新对话 · 将自动创建'}
            </Text>
          </div>

          {/* messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
            {messages.length === 0 && !sending ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Empty
                  image={<RobotOutlined style={{ fontSize: 48, color: '#d9d9d9' }} />}
                  description={
                    <Space direction="vertical" size={2}>
                      <Text type="secondary">向 AI 助手提问，开启你的学习辅导</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        可切换专家角色：规划师 / 阅读指导 / 练习教练 / 专注顾问 / 思维导师 / 行动教练
                      </Text>
                    </Space>
                  }
                />
              </div>
            ) : (
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
                {sending && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Avatar size={32} icon={<RobotOutlined />} style={{ background: '#8c8c8c', flexShrink: 0 }} />
                    <div style={{ background: '#f5f5f5', borderRadius: 12, padding: '8px 14px' }}>
                      <Spin size="small" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </Space>
            )}
          </div>

          {/* input */}
          <div style={{ borderTop: '1px solid #f0f0f0', padding: 12 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                style={{ borderRadius: '8px 0 0 8px' }}
              />
              <Tooltip title="发送">
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  loading={sending}
                  style={{ height: 'auto', borderRadius: '0 8px 8px 0' }}
                />
              </Tooltip>
            </Space.Compact>
          </div>
        </Content>
      </Layout>
    </div>
  )
}

function ConversationItem({
  conv,
  active,
  onClick,
}: {
  conv: ConversationOut
  active: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        background: active ? '#eff6ff' : 'transparent',
        borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <MessageOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
        <Text ellipsis style={{ flex: 1, fontWeight: active ? 600 : 400, fontSize: 13 }}>
          {conv.title || '新对话'}
        </Text>
      </div>
      <div style={{ marginTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Tag style={{ fontSize: 11, margin: 0 }}>{roleLabel(conv.agent_role)}</Tag>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {dayjs(conv.created_at).format('MM-DD HH:mm')}
        </Text>
      </div>
    </div>
  )
}

function MessageBubble({ msg }: { msg: AgentMessageOut }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', gap: 8 }}>
      {!isUser && (
        <Avatar size={32} icon={<RobotOutlined />} style={{ background: '#2563eb', flexShrink: 0 }} />
      )}
      <div style={{ maxWidth: '72%' }}>
        <div
          style={{
            background: isUser ? '#2563eb' : '#f5f5f5',
            color: isUser ? '#fff' : '#1f2937',
            borderRadius: 12,
            padding: '8px 14px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {msg.content}
        </div>
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            justifyContent: isUser ? 'flex-end' : 'flex-start',
          }}
        >
          <Text type="secondary" style={{ fontSize: 11 }}>
            {dayjs(msg.created_at).format('HH:mm')}
          </Text>
          {!isUser && backendTag(msg.meta)}
        </div>
      </div>
      {isUser && (
        <Avatar size={32} icon={<UserOutlined />} style={{ background: '#8c8c8c', flexShrink: 0 }} />
      )}
    </div>
  )
}
