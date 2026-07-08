import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Progress, List, Tag, Empty, Spin, Typography, Button, Space } from 'antd'
import {
  FireOutlined,
  ClockCircleOutlined,
  EditOutlined,
  ScheduleOutlined,
  TrophyOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text } = Typography

const ENGINE_LABELS: Record<string, string> = {
  deliberate_practice: '刻意练习',
  sponge_reading: '海绵阅读',
  deep_work: '深度工作',
  knowledge_action: '知行转化',
  critical_thinking: '批判思维',
}

export default function Dashboard() {
  const nav = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.dashboard,
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  const maxWeekly = Math.max(1, ...data.weekly_focus.map((w) => w.minutes))

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        {dayjs().format('YYYY年MM月DD日 dddd')}，{data.user.display_name ?? data.user.username} 👋
      </Title>

      {/* headline stats */}
      <div className="lf-stat-grid" style={{ marginBottom: 24 }}>
        <Card>
          <Statistic
            title="今日专注（分钟）"
            value={data.today_focus_minutes}
            prefix={<ClockCircleOutlined style={{ color: '#2563eb' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="今日练习（题）"
            value={data.today_practice_count}
            prefix={<EditOutlined style={{ color: '#10b981' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="连续学习（天）"
            value={data.streak_days}
            prefix={<FireOutlined style={{ color: '#f59e0b' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="活跃计划"
            value={data.active_plans}
            prefix={<ScheduleOutlined style={{ color: '#8b5cf6' }} />}
          />
        </Card>
        <Card>
          <Statistic
            title="学习积分"
            value={data.token_balance}
            prefix={<TrophyOutlined style={{ color: '#eab308' }} />}
          />
        </Card>
      </div>

      <Row gutter={24}>
        {/* weekly focus trend */}
        <Col xs={24} lg={14}>
          <Card title="本周专注趋势（分钟）" extra={<Button type="link" onClick={() => nav('/analytics')}>详细分析</Button>}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '0 4px' }}>
              {data.weekly_focus.map((w) => (
                <div key={w.date} style={{ flex: 1, textAlign: 'center' }}>
                  <div
                    style={{
                      height: `${(w.minutes / maxWeekly) * 100}%`,
                      minHeight: w.minutes > 0 ? 4 : 0,
                      background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s',
                      margin: '0 2px',
                    }}
                    title={`${w.date}: ${w.minutes} 分钟`}
                  />
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
                    {dayjs(w.date).format('ddd')}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563' }}>{w.minutes}</div>
                </div>
              ))}
            </div>
          </Card>
        </Col>

        {/* upcoming reviews */}
        <Col xs={24} lg={10}>
          <Card
            title="待复习（SM-2 间隔重复）"
            extra={<Button type="link" onClick={() => nav('/practice')}>去练习</Button>}
            style={{ height: '100%' }}
          >
            {data.upcoming_reviews.length === 0 ? (
              <Empty description="暂无到期复习项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={data.upcoming_reviews.slice(0, 6)}
                renderItem={(item) => (
                  <List.Item>
                    <Space direction="vertical" size={0} style={{ width: '100%' }}>
                      <Text ellipsis style={{ maxWidth: '100%' }}>{item.question}</Text>
                      <Space size={4}>
                        <Tag color={item.item_type === 'apply' ? 'blue' : item.item_type === 'analyze' ? 'purple' : 'default'}>
                          {item.item_type}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          复习 {item.times_reviewed} 次 · 正确 {item.times_correct} 次
                        </Text>
                      </Space>
                    </Space>
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* engine distribution */}
        <Col xs={24} lg={10}>
          <Card title="学习方法论分布">
            {data.engine_distribution.length === 0 ? (
              <Empty description="还没有学习记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {data.engine_distribution.map((e) => {
                  const total = data.engine_distribution.reduce((s, x) => s + x.count, 0)
                  const pct = total > 0 ? Math.round((e.count / total) * 100) : 0
                  return (
                    <div key={e.engine}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text>{ENGINE_LABELS[e.engine] ?? e.engine}</Text>
                        <Text type="secondary">{e.count} 次 · {pct}%</Text>
                      </div>
                      <Progress percent={pct} showInfo={false} strokeColor="#2563eb" />
                    </div>
                  )
                })}
              </Space>
            )}
          </Card>
        </Col>

        {/* achievements */}
        <Col xs={24} lg={14}>
          <Card title="我的成就" extra={<Button type="link" onClick={() => nav('/rewards')}>奖励中心</Button>}>
            {data.achievements.length === 0 ? (
              <Empty description="完成学习任务解锁成就" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Row gutter={[12, 12]}>
                {data.achievements.map((a) => (
                  <Col key={a.achievement_code} xs={12} md={8}>
                    <Card size="small" style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28 }}>{a.icon}</div>
                      <div style={{ fontWeight: 600, fontSize: 13, marginTop: 4 }}>{a.name}</div>
                      <Tag
                        color={a.dimension === 'psychology' ? 'purple' : a.dimension === 'social' ? 'blue' : 'gold'}
                        style={{ marginTop: 4 }}
                      >
                        {a.dimension === 'psychology' ? '心理' : a.dimension === 'social' ? '社交' : '金融'}
                      </Tag>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* recent sessions */}
      {data.recent_sessions.length > 0 && (
        <Card title="最近专注会话" style={{ marginTop: 24 }}>
          <List
            dataSource={data.recent_sessions}
            renderItem={(s) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<ClockCircleOutlined style={{ fontSize: 20, color: '#2563eb' }} />}
                  title={
                    <Space>
                      <Text>{(s.session_data as Record<string, string>)?.task_summary ?? '深度工作'}</Text>
                      <Tag>{(s.session_data as Record<string, string>)?.mode ?? 'pomodoro'}</Tag>
                    </Space>
                  }
                  description={`${dayjs(s.started_at).format('MM-DD HH:mm')} · ${s.duration_minutes} 分钟 · 专注度 ${Math.round(s.focus_score * 100)}%`}
                />
                <Tag color="green">+{s.reward_granted}</Tag>
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}
