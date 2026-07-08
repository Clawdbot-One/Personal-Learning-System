import { useEffect, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { PlayCircleOutlined, CheckOutlined, StopOutlined, FieldTimeOutlined } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { FocusSessionOut, PlanOut } from '../api/types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const MODE_OPTIONS: { label: string; value: string }[] = [
  { label: '番茄钟（25分钟）', value: 'pomodoro' },
  { label: '深度块（长时段）', value: 'deep_block' },
]

const STRATEGY_OPTIONS: { label: string; value: string; desc: string }[] = [
  { label: '修道院式', value: 'monastic', desc: '长期排除一切干扰，专注于单一深度目标。' },
  { label: '双峰式', value: 'bimodal', desc: '将时间分为深度期与开放期，例如以周或季为单位。' },
  { label: '节奏式', value: 'rhythmic', desc: '每日固定时段进入深度工作，形成习惯节奏。' },
  { label: '记者式', value: 'journalistic', desc: '在繁忙日程中随时切入深度工作，灵活切换。' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'processing',
  completed: 'success',
  abandoned: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  active: '进行中',
  completed: '已完成',
  abandoned: '已放弃',
}

interface StartFormValues {
  mode: string
  strategy: string
  planned_minutes: number
  plan_id?: string
  task_summary?: string
}

interface ReflectionFormValues {
  actual_minutes: number
  distraction_count?: number
  reflection?: string
}

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function Focus() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [form] = Form.useForm<StartFormValues>()
  const [reflectForm] = Form.useForm<ReflectionFormValues>()

  const [activeSession, setActiveSession] = useState<FocusSessionOut | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [reflectOpen, setReflectOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: plans } = useQuery({
    queryKey: ['plans'],
    queryFn: api.listPlans,
  })

  const { data: history, isLoading } = useQuery({
    queryKey: ['focus-history'],
    queryFn: () => api.focusHistory(50),
  })

  // Live timer effect
  useEffect(() => {
    if (activeSession) {
      const started = dayjs(activeSession.started_at)
      setElapsed(Math.max(0, dayjs().diff(started, 'second')))
      timerRef.current = setInterval(() => {
        setElapsed(Math.max(0, dayjs().diff(started, 'second')))
      }, 1000)
    } else {
      setElapsed(0)
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [activeSession])

  const startMutation = useMutation({
    mutationFn: (values: StartFormValues) =>
      api.startFocus({
        mode: values.mode,
        strategy: values.strategy,
        plan_id: values.plan_id,
        planned_minutes: values.planned_minutes,
        task_summary: values.task_summary,
      }),
    onSuccess: (session) => {
      setActiveSession(session)
      message.success('专注会话已开始，保持专注！')
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '启动失败')
    },
  })

  const completeMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ReflectionFormValues }) =>
      api.completeFocus(id, {
        actual_minutes: values.actual_minutes,
        distraction_count: values.distraction_count,
        reflection: values.reflection,
      }),
    onSuccess: (session) => {
      const tokens = Math.max(0, Math.round(session.actual_minutes))
      message.success(`专注完成！获得 ${tokens} 积分`)
      setActiveSession(null)
      setReflectOpen(false)
      reflectForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['focus-history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '完成失败')
    },
  })

  const abandonMutation = useMutation({
    mutationFn: (id: string) => api.abandonFocus(id),
    onSuccess: () => {
      message.warning('已放弃本次专注会话')
      setActiveSession(null)
      queryClient.invalidateQueries({ queryKey: ['focus-history'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '操作失败')
    },
  })

  function handleStart() {
    form.validateFields().then((values) => startMutation.mutate(values))
  }

  function openReflect() {
    reflectForm.setFieldsValue({
      actual_minutes: Math.max(1, Math.round(elapsed / 60)),
      distraction_count: 0,
    })
    setReflectOpen(true)
  }

  function submitReflect() {
    if (!activeSession) return
    reflectForm.validateFields().then((values) =>
      completeMutation.mutate({ id: activeSession.id, values }),
    )
  }

  const progressPct = activeSession
    ? Math.min(100, Math.round((elapsed / 60 / activeSession.planned_minutes) * 100))
    : 0

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        <FieldTimeOutlined style={{ marginRight: 8 }} />
        深度工作 · 专注会话
      </Title>

      <Row gutter={24}>
        {/* Session launcher / active session */}
        <Col xs={24} lg={14}>
          <Card
            title="专注会话"
            extra={activeSession && <Tag color={STATUS_COLORS[activeSession.status]}>进行中</Tag>}
          >
            {activeSession ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div
                  style={{
                    fontSize: 56,
                    fontWeight: 700,
                    fontFamily: 'monospace',
                    color: '#2563eb',
                    letterSpacing: 2,
                  }}
                >
                  {formatElapsed(elapsed)}
                </div>
                <div style={{ marginTop: 8, color: '#6b7280' }}>
                  计划 {activeSession.planned_minutes} 分钟 · {MODE_OPTIONS.find((m) => m.value === activeSession.mode)?.label ?? activeSession.mode}
                </div>
                {activeSession.task_summary && (
                  <Paragraph style={{ marginTop: 12, color: '#374151' }}>
                    🎯 {activeSession.task_summary}
                  </Paragraph>
                )}
                <Progress percent={progressPct} strokeColor="#2563eb" style={{ maxWidth: 360, margin: '16px auto' }} />
                <Space style={{ marginTop: 16 }}>
                  <Button type="primary" icon={<CheckOutlined />} size="large" onClick={openReflect}>
                    完成
                  </Button>
                  <Button danger icon={<StopOutlined />} size="large" onClick={() => abandonMutation.mutate(activeSession.id)}>
                    放弃
                  </Button>
                </Space>
              </div>
            ) : (
              <Form
                form={form}
                layout="vertical"
                initialValues={{ mode: 'pomodoro', strategy: 'rhythmic', planned_minutes: 25 }}
              >
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="mode" label="模式">
                      <Select options={MODE_OPTIONS} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="strategy" label="策略">
                      <Select options={STRATEGY_OPTIONS.map((s) => ({ label: s.label, value: s.value }))} />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item name="planned_minutes" label="计划时长（分钟）">
                      <InputNumber min={1} max={240} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="plan_id" label="关联计划（可选）">
                      <Select
                        allowClear
                        placeholder="选择关联计划"
                        options={(plans ?? []).map((p: PlanOut) => ({ label: p.title, value: p.id }))}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="task_summary" label="任务摘要">
                  <Input placeholder="例如：完成 PR 文档第 3 章" />
                </Form.Item>
                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<PlayCircleOutlined />}
                  loading={startMutation.isPending}
                  onClick={handleStart}
                >
                  开始专注
                </Button>
              </Form>
            )}
          </Card>
        </Col>

        {/* Strategy education */}
        <Col xs={24} lg={10}>
          <Card title="深度工作四种策略" style={{ height: '100%' }}>
            <Paragraph type="secondary" style={{ marginBottom: 12 }}>
              源自《深度工作》—— 选择与自己生活节奏匹配的策略，更容易坚持。
            </Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {STRATEGY_OPTIONS.map((s) => (
                <div key={s.value}>
                  <Text strong>{s.label}</Text>
                  <Paragraph style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
                    {s.desc}
                  </Paragraph>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* History */}
      <Card title="专注历史" style={{ marginTop: 24 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : !history || history.length === 0 ? (
          <Empty description="还没有专注记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[16, 16]}>
            {history.map((s) => (
              <Col key={s.id} xs={24} md={12} lg={8}>
                <Card size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong>{s.task_summary ?? '专注会话'}</Text>
                    <Tag color={STATUS_COLORS[s.status] ?? 'default'}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </Tag>
                  </div>
                  <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
                    {dayjs(s.started_at).format('MM-DD HH:mm')} · {s.actual_minutes} / {s.planned_minutes} 分钟 · {MODE_OPTIONS.find((m) => m.value === s.mode)?.label ?? s.mode}
                  </div>
                  <div style={{ marginTop: 4, color: '#9ca3af', fontSize: 12 }}>
                    分心 {s.distraction_count} 次 · {STRATEGY_OPTIONS.find((x) => x.value === s.strategy)?.label ?? s.strategy}
                  </div>
                  {s.reflection && (
                    <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: 13, color: '#374151' }}>
                      💭 {s.reflection}
                    </Paragraph>
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* Reflection modal */}
      <Modal
        title="专注复盘"
        open={reflectOpen}
        onCancel={() => setReflectOpen(false)}
        onOk={submitReflect}
        confirmLoading={completeMutation.isPending}
        okText="提交并完成"
        cancelText="取消"
      >
        <Form form={reflectForm} layout="vertical">
          <Form.Item
            name="actual_minutes"
            label="实际时长（分钟）"
            rules={[{ required: true, message: '请输入实际时长' }]}
          >
            <InputNumber min={1} max={240} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="distraction_count" label="分心次数">
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="reflection" label="复盘反思">
            <Input.TextArea rows={3} placeholder="本次专注的收获、卡点、下次改进…" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
