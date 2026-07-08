import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Progress,
  Rate,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, EditOutlined, ApartmentOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { PracticeAttemptOut, PracticeItemOut, SkillNodeOut } from '../api/types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const ITEM_TYPE_OPTIONS: { label: string; value: string; color: string }[] = [
  { label: '回忆', value: 'recall', color: 'default' },
  { label: '应用', value: 'apply', color: 'blue' },
  { label: '分析', value: 'analyze', color: 'purple' },
]

const ITEM_TYPE_MAP: Record<string, { label: string; color: string }> = Object.fromEntries(
  ITEM_TYPE_OPTIONS.map((o) => [o.value, { label: o.label, color: o.color }]),
)

interface ItemFormValues {
  question: string
  answer: string
  skill_node_id?: string
  item_type: string
  difficulty: number
}

interface SkillFormValues {
  domain: string
  name: string
  parent_id?: string
  level: number
}

interface AttemptState {
  userAnswer: string
  rating: number
  result: PracticeAttemptOut | null
  submitting: boolean
}

export default function Practice() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [skillModalOpen, setSkillModalOpen] = useState(false)
  const [activeItem, setActiveItem] = useState<PracticeItemOut | null>(null)
  const [attempt, setAttempt] = useState<AttemptState>({ userAnswer: '', rating: 3, result: null, submitting: false })
  const [expandedAnswer, setExpandedAnswer] = useState<string | null>(null)
  const [itemForm] = Form.useForm<ItemFormValues>()
  const [skillForm] = Form.useForm<SkillFormValues>()

  const { data: dueItems, isLoading: dueLoading } = useQuery({
    queryKey: ['due'],
    queryFn: () => api.dueItems(20),
  })

  const { data: allItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.listItems(100),
  })

  const { data: skills } = useQuery({
    queryKey: ['skills'],
    queryFn: api.listSkills,
  })

  const submitAttemptMutation = useMutation({
    mutationFn: (vars: { item_id: string; user_answer: string; self_rating: number }) =>
      api.submitAttempt(vars),
    onMutate: () => setAttempt((s) => ({ ...s, submitting: true })),
    onSuccess: (result) => {
      setAttempt((s) => ({ ...s, result, submitting: false }))
      message.success(`提交成功 · 获得 ${result.tokens_earned} 积分`)
      queryClient.invalidateQueries({ queryKey: ['due'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      queryClient.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: (e) => {
      setAttempt((s) => ({ ...s, submitting: false }))
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '提交失败')
    },
  })

  const addItemMutation = useMutation({
    mutationFn: (values: ItemFormValues) =>
      api.addItem({
        question: values.question,
        answer: values.answer,
        skill_node_id: values.skill_node_id,
        item_type: values.item_type,
        difficulty: values.difficulty,
      }),
    onSuccess: () => {
      message.success('题目已添加')
      setItemModalOpen(false)
      itemForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['due'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  const addSkillMutation = useMutation({
    mutationFn: (values: SkillFormValues) =>
      api.addSkill({
        domain: values.domain,
        name: values.name,
        parent_id: values.parent_id,
        level: values.level,
      }),
    onSuccess: () => {
      message.success('技能已添加')
      setSkillModalOpen(false)
      skillForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['skills'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  function openAttempt(item: PracticeItemOut) {
    setActiveItem(item)
    setAttempt({ userAnswer: '', rating: 3, result: null, submitting: false })
  }

  function submitAttempt() {
    if (!activeItem) return
    if (!attempt.userAnswer.trim()) {
      message.warning('请先作答')
      return
    }
    submitAttemptMutation.mutate({
      item_id: activeItem.id,
      user_answer: attempt.userAnswer,
      self_rating: attempt.rating,
    })
  }

  // Group skills by domain for the skill tree
  const skillsByDomain = (skills ?? []).reduce<Record<string, SkillNodeOut[]>>((acc, s) => {
    const key = s.domain || '未分类'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  const itemColumns = [
    {
      title: '题目',
      dataIndex: 'question',
      key: 'question',
      render: (q: string, record: PracticeItemOut) => (
        <Space direction="vertical" size={0}>
          <Text ellipsis style={{ maxWidth: 280 }}>{q}</Text>
          <a style={{ fontSize: 12 }} onClick={() => setExpandedAnswer(expandedAnswer === record.id ? null : record.id)}>
            {expandedAnswer === record.id ? '收起答案' : '查看答案'}
          </a>
          {expandedAnswer === record.id && (
            <Paragraph style={{ margin: '4px 0 0', fontSize: 12, color: '#374151' }}>
              {record.answer}
            </Paragraph>
          )}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'item_type',
      key: 'item_type',
      width: 80,
      render: (t: string) => {
        const m = ITEM_TYPE_MAP[t]
        return <Tag color={m?.color ?? 'default'}>{m?.label ?? t}</Tag>
      },
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 80,
      render: (d: number) => <Text>{Math.round(d * 100)}%</Text>,
    },
    {
      title: '下次复习',
      dataIndex: 'next_review_at',
      key: 'next_review_at',
      width: 120,
      render: (d: string) => <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(d).format('MM-DD HH:mm')}</Text>,
    },
    {
      title: '复习/正确',
      key: 'stats',
      width: 100,
      render: (_: unknown, r: PracticeItemOut) => (
        <Text type="secondary" style={{ fontSize: 12 }}>{r.times_reviewed} / {r.times_correct}</Text>
      ),
    },
    {
      title: '难度系数',
      dataIndex: 'ease_factor',
      key: 'ease_factor',
      width: 90,
      render: (e: number) => <Text type="secondary" style={{ fontSize: 12 }}>{e.toFixed(2)}</Text>,
    },
  ]

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        <EditOutlined style={{ marginRight: 8 }} />
        刻意练习 · 间隔重复
      </Title>

      <Row gutter={24}>
        <Col xs={24} lg={17}>
          <Tabs
            defaultActiveKey="due"
            items={[
              {
                key: 'due',
                label: `今日复习 ${dueItems?.length ? `(${dueItems.length})` : ''}`,
                children: dueLoading ? (
                  <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                ) : !dueItems || dueItems.length === 0 ? (
                  <Empty description="今日没有到期复习项，保持节奏 🎯" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Row gutter={[16, 16]}>
                    {dueItems.map((item) => (
                      <Col key={item.id} xs={24} md={12}>
                        <Card size="small" hoverable onClick={() => openAttempt(item)}>
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <Tag color={ITEM_TYPE_MAP[item.item_type]?.color ?? 'default'}>
                                {ITEM_TYPE_MAP[item.item_type]?.label ?? item.item_type}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                难度 {Math.round(item.difficulty * 100)}%
                              </Text>
                            </div>
                            <Text strong style={{ fontSize: 14 }}>{item.question}</Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              已复习 {item.times_reviewed} 次 · 下次 {dayjs(item.next_review_at).format('MM-DD HH:mm')}
                            </Text>
                          </Space>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                ),
              },
              {
                key: 'all',
                label: '练习题库',
                children: (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <Button type="primary" icon={<PlusOutlined />} onClick={() => setItemModalOpen(true)}>
                        新增题目
                      </Button>
                    </div>
                    {itemsLoading ? (
                      <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
                    ) : (
                      <Table
                        rowKey="id"
                        size="small"
                        dataSource={allItems ?? []}
                        columns={itemColumns}
                        pagination={{ pageSize: 10, size: 'small' }}
                      />
                    )}
                  </>
                ),
              },
            ]}
          />
        </Col>

        {/* Side panel: skill tree */}
        <Col xs={24} lg={7}>
          <Card
            title={<span><ApartmentOutlined style={{ marginRight: 8 }} />技能树</span>}
            extra={<Button size="small" icon={<PlusOutlined />} onClick={() => setSkillModalOpen(true)}>添加技能</Button>}
            style={{ height: '100%' }}
          >
            {!skills || skills.length === 0 ? (
              <Empty description="还没有技能节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              Object.entries(skillsByDomain).map(([domain, items]) => (
                <div key={domain} style={{ marginBottom: 16 }}>
                  <Tag color="blue" style={{ marginBottom: 8 }}>{domain}</Tag>
                  {items.map((s) => (
                    <div key={s.id} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 13 }}>{s.name}</Text>
                        {s.is_bottleneck && <Tag color="red" style={{ fontSize: 11 }}>瓶颈</Tag>}
                      </div>
                      <Progress
                        percent={s.level * 10}
                        size="small"
                        showInfo={false}
                        strokeColor={s.level >= 7 ? '#10b981' : s.level >= 4 ? '#f59e0b' : '#ef4444'}
                      />
                    </div>
                  ))}
                </div>
              ))
            )}
          </Card>
        </Col>
      </Row>

      {/* Methodology card */}
      <Card title="方法论笔记" style={{ marginTop: 24 }}>
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <Text strong>SM-2 间隔重复</Text>
            <Paragraph style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>
              根据你对每道题的自评（0-5 星，对应 SM-2 的 quality 分），系统会自动调整下次复习的时间间隔与难度系数。评 3 星以上视为答对，间隔延长；评 0-2 星视为答错，间隔重置。
            </Paragraph>
          </Col>
          <Col xs={24} md={12}>
            <Text strong>学习区（70-85% 正确率）</Text>
            <Paragraph style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>
              刻意练习应停留在「学习区」—— 既不太简单（{'<70%'} 难度偏低），也不太难（{'>85%'} 易挫败）。系统会按你的正确率动态调整题目难度，保持在最佳挑战区间。
            </Paragraph>
          </Col>
        </Row>
      </Card>

      {/* Attempt modal */}
      <Modal
        title="作答"
        open={!!activeItem}
        onCancel={() => setActiveItem(null)}
        footer={
          attempt.result ? (
            <Button type="primary" onClick={() => setActiveItem(null)}>完成</Button>
          ) : (
            <Space>
              <Button onClick={() => setActiveItem(null)}>取消</Button>
              <Button type="primary" loading={attempt.submitting} onClick={submitAttempt}>提交</Button>
            </Space>
          )
        }
        width={560}
      >
        {activeItem && !attempt.result && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <Tag color={ITEM_TYPE_MAP[activeItem.item_type]?.color ?? 'default'}>
                {ITEM_TYPE_MAP[activeItem.item_type]?.label ?? activeItem.item_type}
              </Tag>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                难度 {Math.round(activeItem.difficulty * 100)}%
              </Text>
            </div>
            <Paragraph strong style={{ marginBottom: 12 }}>{activeItem.question}</Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>你的作答</Text>
            <Input.TextArea
              rows={4}
              value={attempt.userAnswer}
              onChange={(e) => setAttempt((s) => ({ ...s, userAnswer: e.target.value }))}
              placeholder="输入你的答案…"
              style={{ marginBottom: 12 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>自评（SM-2 quality）</Text>
            <div style={{ marginTop: 4 }}>
              <Rate
                value={attempt.rating}
                onChange={(v) => setAttempt((s) => ({ ...s, rating: v }))}
              />
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                {attempt.rating >= 4 ? '掌握良好' : attempt.rating >= 3 ? '基本掌握' : '需要重练'}
              </Text>
            </div>
          </div>
        )}
        {activeItem && attempt.result && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <CheckCircleOutlined style={{ fontSize: 40, color: attempt.result.is_correct ? '#10b981' : '#f59e0b' }} />
              <div style={{ marginTop: 8 }}>
                <Tag color={attempt.result.is_correct ? 'success' : 'warning'}>
                  {attempt.result.is_correct ? '答对' : '答错'}
                </Tag>
                <Tag color="gold">+{attempt.result.tokens_earned} 积分</Tag>
              </div>
            </div>
            <Card size="small" title="参考答案" style={{ marginBottom: 12 }}>
              <Paragraph style={{ margin: 0 }}>{activeItem.answer}</Paragraph>
            </Card>
            {attempt.result.feedback && (
              <Card size="small" title="反馈" style={{ marginBottom: 12 }}>
                <Paragraph style={{ margin: 0, color: '#374151' }}>{attempt.result.feedback}</Paragraph>
              </Card>
            )}
            <Text type="secondary" style={{ fontSize: 13 }}>
              下次复习：{dayjs(attempt.result.next_review_at).format('YYYY-MM-DD HH:mm')}
              {' · 新难度 '}{Math.round(attempt.result.new_difficulty * 100)}%
            </Text>
          </div>
        )}
      </Modal>

      {/* Add item modal */}
      <Modal
        title="新增题目"
        open={itemModalOpen}
        onCancel={() => setItemModalOpen(false)}
        onOk={() => itemForm.validateFields().then((v) => addItemMutation.mutate(v))}
        confirmLoading={addItemMutation.isPending}
        okText="添加"
        cancelText="取消"
        width={560}
      >
        <Form
          form={itemForm}
          layout="vertical"
          initialValues={{ item_type: 'recall', difficulty: 0.4 }}
        >
          <Form.Item name="question" label="题目" rules={[{ required: true, message: '请输入题目' }]}>
            <Input.TextArea rows={3} placeholder="输入题目内容" />
          </Form.Item>
          <Form.Item name="answer" label="答案" rules={[{ required: true, message: '请输入答案' }]}>
            <Input.TextArea rows={3} placeholder="输入参考答案" />
          </Form.Item>
          <Form.Item name="skill_node_id" label="关联技能（可选）">
            <Select
              allowClear
              placeholder="选择技能节点"
              options={(skills ?? []).map((s) => ({
                label: `${s.domain} / ${s.name}`,
                value: s.id,
              }))}
            />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="item_type" label="题型">
                <Select options={ITEM_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="difficulty" label="难度">
                <Slider min={0} max={1} step={0.05} marks={{ 0: '0', 0.5: '中', 1: '1' }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add skill modal */}
      <Modal
        title="添加技能"
        open={skillModalOpen}
        onCancel={() => setSkillModalOpen(false)}
        onOk={() => skillForm.validateFields().then((v) => addSkillMutation.mutate(v))}
        confirmLoading={addSkillMutation.isPending}
        okText="添加"
        cancelText="取消"
      >
        <Form form={skillForm} layout="vertical" initialValues={{ level: 1 }}>
          <Form.Item name="domain" label="领域" rules={[{ required: true, message: '请输入领域' }]}>
            <Input placeholder="例如：前端工程" />
          </Form.Item>
          <Form.Item name="name" label="技能名称" rules={[{ required: true, message: '请输入技能名称' }]}>
            <Input placeholder="例如：TypeScript" />
          </Form.Item>
          <Form.Item name="parent_id" label="父技能（可选）">
            <Select
              allowClear
              placeholder="选择父技能"
              options={(skills ?? []).map((s) => ({ label: `${s.domain} / ${s.name}`, value: s.id }))}
            />
          </Form.Item>
          <Form.Item name="level" label="当前等级（0-10）">
            <Slider min={0} max={10} step={1} marks={{ 0: '0', 5: '5', 10: '10' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
