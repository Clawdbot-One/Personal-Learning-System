import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Row,
  Col,
  Statistic,
  Tabs,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Space,
  Empty,
  Spin,
  Typography,
  Avatar,
  Segmented,
  App,
} from 'antd'
import {
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import type {
  RewardOut,
  AchievementOut,
  UserAchievementOut,
  LeaderboardEntry,
} from '../api/types'
import { useAuthStore } from '../store/authStore'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const DIM_META: Record<string, { label: string; color: string }> = {
  psychology: { label: '心理', color: 'purple' },
  social: { label: '社交', color: 'blue' },
  finance: { label: '金融', color: 'gold' },
}

function dimTag(dim: string) {
  const m = DIM_META[dim]
  if (!m) return <Tag>{dim}</Tag>
  return <Tag color={m.color}>{m.label}</Tag>
}

const CONTRACT_STATUS: Record<string, { label: string; color: string }> = {
  active: { label: '进行中', color: 'processing' },
  won: { label: '兑现成功', color: 'success' },
  success: { label: '兑现成功', color: 'success' },
  lost: { label: '判定失败', color: 'error' },
  failed: { label: '判定失败', color: 'error' },
  settled: { label: '已结算', color: 'default' },
}

export default function Rewards() {
  const { data: balance, isLoading } = useQuery({
    queryKey: ['balance'],
    queryFn: api.balance,
  })

  if (isLoading) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        奖励中心 · 跨学科激励
      </Title>

      {/* top stat cards */}
      <Row gutter={24} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="积分余额"
              value={balance?.token_balance ?? 0}
              prefix={<TrophyOutlined style={{ color: '#eab308' }} />}
              suffix="枚"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="声望"
              value={balance?.reputation ?? 0}
              prefix={<StarOutlined style={{ color: '#8b5cf6' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="连续天数"
              value={balance?.streak_days ?? 0}
              prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
              suffix="天"
            />
          </Card>
        </Col>
      </Row>

      <Tabs
        defaultActiveKey="ledger"
        items={[
          { key: 'ledger', label: '积分账本', children: <LedgerTab /> },
          { key: 'wall', label: '成就墙', children: <WallTab /> },
          { key: 'board', label: '排行榜', children: <BoardTab /> },
          { key: 'future', label: '学习期货', children: <ContractTab /> },
          { key: 'roi', label: '学习ROI', children: <RoiTab /> },
        ]}
      />

      {/* methodology */}
      <Card title="激励机制设计" style={{ marginTop: 24, background: '#faf5ff', borderColor: '#d3adf7' }}>
        <Row gutter={[24, 16]}>
          <Col xs={24} md={8}>
            <Text strong style={{ color: '#722ed1' }}>心理学</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 4 }}>
              内在动机优于外在奖励，借助心流与即时反馈触发多巴胺，让学习本身成为奖赏。
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Text strong style={{ color: '#2563eb' }}>社会学</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 4 }}>
              通过身份认同、排行榜竞争与社区归属，把学习嵌入社交关系，积累社会资本。
            </Paragraph>
          </Col>
          <Col xs={24} md={8}>
            <Text strong style={{ color: '#d48806' }}>金融学</Text>
            <Paragraph type="secondary" style={{ fontSize: 13, marginTop: 4 }}>
              代币经济量化投入产出，学习期货用损失厌恶锁定承诺，ROI 衡量时间投资回报。
            </Paragraph>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

/* ---------------- 积分账本 ---------------- */
function LedgerTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['rewardHistory'],
    queryFn: () => api.rewardHistory(50),
  })

  const columns = [
    {
      title: '维度',
      dataIndex: 'dimension',
      width: 90,
      render: (dim: string) => dimTag(dim),
    },
    {
      title: '类型',
      dataIndex: 'reward_type',
      width: 140,
      render: (t: string) => <Tag>{t}</Tag>,
    },
    {
      title: '积分',
      dataIndex: 'points',
      width: 100,
      align: 'right' as const,
      render: (p: number) => (
        <Text style={{ color: p >= 0 ? '#52c41a' : '#cf1322', fontWeight: 600 }}>
          {p >= 0 ? `+${p}` : p}
        </Text>
      ),
    },
    {
      title: '变动后余额',
      dataIndex: 'balance_after',
      width: 110,
      align: 'right' as const,
    },
    {
      title: '原因',
      dataIndex: 'reason',
      render: (r: string | null) => r || <Text type="secondary">—</Text>,
    },
    {
      title: '时间',
      dataIndex: 'earned_at',
      width: 160,
      render: (t: string) => <Text type="secondary">{dayjs(t).format('MM-DD HH:mm')}</Text>,
    },
  ]

  return (
    <Table<RewardOut>
      rowKey="id"
      loading={isLoading}
      dataSource={data}
      columns={columns}
      pagination={{ pageSize: 10 }}
      size="middle"
      locale={{ emptyText: <Empty description="暂无积分记录" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
    />
  )
}

/* ---------------- 成就墙 ---------------- */
function WallTab() {
  const { data: all, isLoading: l1 } = useQuery({
    queryKey: ['allAchievements'],
    queryFn: api.allAchievements,
  })
  const { data: mine, isLoading: l2 } = useQuery({
    queryKey: ['myAchievements'],
    queryFn: api.myAchievements,
  })

  if (l1 || l2) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    )
  }

  const earnedCodes = new Set((mine ?? []).map((m) => m.achievement_code))

  return (
    <Row gutter={24}>
      <Col xs={24} md={12}>
        <Card title="全部成就" size="small">
          {(all ?? []).length === 0 ? (
            <Empty description="暂无成就" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Row gutter={[12, 12]}>
              {all?.map((a) => <AchievementCell key={a.code} a={a} earned={earnedCodes.has(a.code)} />)}
            </Row>
          )}
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="我的成就" size="small">
          {(mine ?? []).length === 0 ? (
            <Empty description="继续学习解锁成就" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <Row gutter={[12, 12]}>
              {mine?.map((m) => <EarnedCell key={m.achievement_code} m={m} />)}
            </Row>
          )}
        </Card>
      </Col>
    </Row>
  )
}

function AchievementCell({ a, earned }: { a: AchievementOut; earned: boolean }) {
  return (
    <Col xs={24} sm={12}>
      <Card
        size="small"
        style={{
          opacity: earned ? 1 : 0.55,
          filter: earned ? 'none' : 'grayscale(0.8)',
          borderColor: earned ? '#d9f7be' : '#f0f0f0',
          background: earned ? '#f6ffed' : '#fafafa',
        }}
      >
        <Space align="start">
          <span style={{ fontSize: 26 }}>{a.icon || '🏅'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>
              {a.name} {earned ? <CheckOutlined style={{ color: '#52c41a' }} /> : <CloseOutlined style={{ color: '#bfbfbf', fontSize: 11 }} />}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>{a.description}</div>
            <Space size={4} style={{ marginTop: 6 }}>
              {dimTag(a.dimension)}
              <Tag>阈值 {a.threshold}</Tag>
            </Space>
          </div>
        </Space>
      </Card>
    </Col>
  )
}

function EarnedCell({ m }: { m: UserAchievementOut }) {
  return (
    <Col xs={24} sm={12}>
      <Card size="small" style={{ borderColor: '#d9f7be', background: '#f6ffed' }}>
        <Space align="start">
          <span style={{ fontSize: 26 }}>{m.icon || '🏅'}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name}</div>
            <Space size={4} style={{ marginTop: 4 }}>
              {dimTag(m.dimension)}
              <Text type="secondary" style={{ fontSize: 12 }}>
                {dayjs(m.earned_at).format('MM-DD 获得')}
              </Text>
            </Space>
          </div>
        </Space>
      </Card>
    </Col>
  )
}

/* ---------------- 排行榜 ---------------- */
const METRICS = [
  { label: '积分', value: 'token_balance' },
  { label: '声望', value: 'reputation' },
  { label: '连续天数', value: 'streak_days' },
]

function BoardTab() {
  const user = useAuthStore((s) => s.user)
  const [metric, setMetric] = useState<string>('token_balance')
  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', metric],
    queryFn: () => api.leaderboard(metric, 10),
  })

  const columns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 70,
      render: (rank: number) => {
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank
        return <Text strong>{medal}</Text>
      },
    },
    {
      title: '用户',
      dataIndex: 'username',
      render: (_: string, r: LeaderboardEntry) => (
        <Space>
          <Avatar size="small" style={{ background: r.user_id === user?.id ? '#2563eb' : '#8c8c8c' }}>
            {(r.display_name ?? r.username).charAt(0).toUpperCase()}
          </Avatar>
          <Text strong={r.user_id === user?.id}>
            {r.display_name ?? r.username}
            {r.user_id === user?.id && <Tag color="blue" style={{ marginLeft: 6 }}>我</Tag>}
          </Text>
        </Space>
      ),
    },
    { title: '积分', dataIndex: 'token_balance', width: 100, align: 'right' as const },
    { title: '声望', dataIndex: 'reputation', width: 100, align: 'right' as const },
    { title: '连续天数', dataIndex: 'streak_days', width: 100, align: 'right' as const },
  ]

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Segmented options={METRICS} value={metric} onChange={(v) => setMetric(v as string)} />
      </div>
      <Table<LeaderboardEntry>
        rowKey="user_id"
        loading={isLoading}
        dataSource={data}
        columns={columns}
        pagination={false}
        size="middle"
        rowClassName={(r) => (r.user_id === user?.id ? 'lf-row-highlight' : '')}
        locale={{ emptyText: <Empty description="暂无排行数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </div>
  )
}

/* ---------------- 学习期货 ---------------- */
function ContractTab() {
  const { message } = App.useApp()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const [open, setOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['contracts'],
    queryFn: api.listContracts,
  })

  const createMut = useMutation({
    mutationFn: api.createContract,
    onSuccess: () => {
      message.success('学习期货已创建')
      qc.invalidateQueries({ queryKey: ['contracts'] })
      setOpen(false)
      form.resetFields()
    },
    onError: () => message.error('创建失败，请稍后重试'),
  })

  const settleMut = useMutation({
    mutationFn: (vars: { id: string; success: boolean }) =>
      api.settleContract(vars.id, vars.success),
    onSuccess: () => {
      message.success('期货已结算')
      qc.invalidateQueries({ queryKey: ['contracts'] })
      qc.invalidateQueries({ queryKey: ['balance'] })
    },
    onError: () => message.error('结算失败，请稍后重试'),
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text type="secondary" style={{ fontSize: 13 }}>
          利用「损失厌恶」锁定承诺：押注学习目标，达成则兑现奖励，未达成则损失押注。
        </Text>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          创建期货
        </Button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
      ) : (data ?? []).length === 0 ? (
        <Empty description="还没有学习期货合约" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Row gutter={[16, 16]}>
          {data?.map((c) => {
            const meta = CONTRACT_STATUS[c.status] ?? { label: c.status, color: 'default' }
            const isActive = c.status === 'active'
            return (
              <Col key={c.id} xs={24} sm={12} lg={8}>
                <Card size="small" title={<Text strong>{c.title}</Text>}>
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">押注</Text>
                      <Text style={{ color: '#cf1322', fontWeight: 600 }}>-{c.stake}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">奖励</Text>
                      <Text style={{ color: '#389e0d', fontWeight: 600 }}>+{c.reward}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary">截止</Text>
                      <Text>{dayjs(c.deadline).format('YYYY-MM-DD HH:mm')}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text type="secondary">状态</Text>
                      <Tag color={meta.color}>{meta.label}</Tag>
                    </div>
                    {isActive && (
                      <Space style={{ marginTop: 8, width: '100%' }}>
                        <Button
                          size="small"
                          type="primary"
                          icon={<CheckOutlined />}
                          loading={settleMut.isPending}
                          onClick={() => settleMut.mutate({ id: c.id, success: true })}
                        >
                          兑现成功
                        </Button>
                        <Button
                          size="small"
                          danger
                          icon={<CloseOutlined />}
                          loading={settleMut.isPending}
                          onClick={() => settleMut.mutate({ id: c.id, success: false })}
                        >
                          判定失败
                        </Button>
                      </Space>
                    )}
                  </Space>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      <Modal
        title="创建学习期货"
        open={open}
        onCancel={() => setOpen(false)}
        confirmLoading={createMut.isPending}
        onOk={() => form.submit()}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(v) =>
            createMut.mutate({
              title: v.title,
              stake: v.stake,
              reward: v.reward,
              deadline: (v.deadline as dayjs.Dayjs).toISOString(),
            })
          }
        >
          <Form.Item name="title" label="目标标题" rules={[{ required: true, message: '请输入目标标题' }]}>
            <Input placeholder="例如：本周完成 5 篇深度阅读笔记" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="stake" label="押注积分" rules={[{ required: true, message: '请输入押注' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="未达成将损失" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reward" label="奖励积分" rules={[{ required: true, message: '请输入奖励' }]}>
                <InputNumber min={1} style={{ width: '100%' }} placeholder="达成可获得" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="deadline" label="截止时间" rules={[{ required: true, message: '请选择截止时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Text type="secondary" style={{ fontSize: 12 }}>
            到期前完成目标可兑现奖励，否则损失押注——用损失厌恶对抗拖延。
          </Text>
        </Form>
      </Modal>
    </div>
  )
}

/* ---------------- 学习 ROI ---------------- */
function RoiTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['roi'],
    queryFn: api.roi,
  })

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin />
      </div>
    )
  }

  return (
    <div>
      <Row gutter={24}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="投入时间" value={data?.invested_minutes ?? 0} suffix="分钟" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="产出评分" value={data?.output_score ?? 0} suffix="/100" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="每分钟 ROI"
              value={data?.roi_per_minute ?? 0}
              precision={3}
              prefix={<StarOutlined style={{ color: '#8b5cf6' }} />}
            />
          </Card>
        </Col>
      </Row>
      <Card style={{ marginTop: 16 }}>
        <Space direction="vertical" size={4}>
          <Text strong>综合评估</Text>
          <Paragraph style={{ margin: 0 }}>
            {data?.verdict ? (
              <Text>{data.verdict}</Text>
            ) : (
              <Text type="secondary">暂无足够数据评估学习投资回报率，继续学习以生成报告。</Text>
            )}
          </Paragraph>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ROI = 产出评分 ÷ 投入分钟数，衡量你每分钟学习时间的有效产出。坚持深度工作与刻意练习可稳步提升。
          </Text>
        </Space>
      </Card>
    </div>
  )
}
