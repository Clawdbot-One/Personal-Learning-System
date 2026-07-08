import { useQuery } from '@tanstack/react-query'
import { Card, Row, Col, Statistic, Spin, Empty, Typography, Space } from 'antd'
import {
  ClockCircleOutlined,
  EditOutlined,
  BookOutlined,
  ApartmentOutlined,
  LinkOutlined,
  BulbOutlined,
  TrophyOutlined,
  FireOutlined,
  CheckCircleOutlined,
  AimOutlined,
} from '@ant-design/icons'
import { api } from '../api/client'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const ENGINE_LABELS: Record<string, string> = {
  deliberate_practice: '刻意练习',
  sponge_reading: '海绵阅读',
  deep_work: '深度工作',
  knowledge_action: '知行转化',
  critical_thinking: '批判思维',
}

const ENGINE_COLORS: Record<string, string> = {
  deliberate_practice: '#2563eb',
  sponge_reading: '#10b981',
  deep_work: '#8b5cf6',
  knowledge_action: '#f59e0b',
  critical_thinking: '#ef4444',
}

const METRIC_DEFS: { key: string; label: string; icon: React.ReactNode; color: string; suffix?: string }[] = [
  { key: 'focus_sessions', label: '专注会话', icon: <AimOutlined />, color: '#2563eb' },
  { key: 'focus_minutes', label: '专注分钟', icon: <ClockCircleOutlined />, color: '#2563eb', suffix: '分' },
  { key: 'practice_correct', label: '练习正确', icon: <EditOutlined />, color: '#10b981' },
  { key: 'notes_count', label: '阅读笔记', icon: <BookOutlined />, color: '#0891b2' },
  { key: 'knowledge_nodes', label: '知识节点', icon: <ApartmentOutlined />, color: '#8b5cf6' },
  { key: 'action_plans_done', label: '完成行动计划', icon: <LinkOutlined />, color: '#f59e0b' },
  { key: 'critical_analyses', label: '批判分析', icon: <BulbOutlined />, color: '#ef4444' },
  { key: 'contracts_won', label: '期货兑现', icon: <CheckCircleOutlined />, color: '#16a34a' },
  { key: 'streak_days', label: '连续天数', icon: <FireOutlined />, color: '#f59e0b', suffix: '天' },
  { key: 'token_balance', label: '学习积分', icon: <TrophyOutlined />, color: '#eab308' },
]

export default function Analytics() {
  const { data: weekly, isLoading: lw } = useQuery({
    queryKey: ['weekly'],
    queryFn: api.weekly,
  })
  const { data: engines, isLoading: le } = useQuery({
    queryKey: ['engines'],
    queryFn: api.engines,
  })
  const { data: metrics, isLoading: lm } = useQuery({
    queryKey: ['metrics'],
    queryFn: api.metrics,
  })

  if (lw && le && lm) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        学习分析
      </Title>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card title="近 7 天学习趋势" style={{ height: '100%' }}>
            {lw ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : weekly && weekly.days.length > 0 ? (
              <WeeklyChart days={weekly.days} />
            ) : (
              <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="学习方法论分布" style={{ height: '100%' }}>
            {le ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
            ) : engines && engines.breakdown.length > 0 ? (
              <EngineDonut breakdown={engines.breakdown} />
            ) : (
              <Empty description="还没有学习记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Card>
        </Col>
      </Row>

      <Card title="全量学习指标" style={{ marginTop: 24 }}>
        {lm ? (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        ) : (
          <div className="lf-stat-grid">
            {METRIC_DEFS.map((d) => (
              <Card key={d.key}>
                <Statistic
                  title={d.label}
                  value={metrics?.[d.key] ?? 0}
                  prefix={<span style={{ color: d.color }}>{d.icon}</span>}
                  suffix={d.suffix}
                />
              </Card>
            ))}
          </div>
        )}
      </Card>

      {metrics && <InsightsCard metrics={metrics} />}
    </div>
  )
}

/* ---------------- 周趋势：柱状(专注分钟) + 折线(练习题数) ---------------- */
function WeeklyChart({
  days,
}: {
  days: { date: string; weekday: string; focus_minutes: number; practice_count: number }[]
}) {
  const W = 560
  const H = 260
  const mLeft = 44
  const mRight = 44
  const mTop = 24
  const mBottom = 40
  const chartH = H - mTop - mBottom // 196
  const chartW = W - mLeft - mRight // 472
  const dayW = chartW / days.length
  const baseline = mTop + chartH // 220

  const maxFocus = Math.max(1, ...days.map((d) => d.focus_minutes))
  const maxPractice = Math.max(1, ...days.map((d) => d.practice_count))

  const focusColor = '#2563eb'
  const practiceColor = '#10b981'
  const barW = 18

  const linePoints = days.map((d, i) => {
    const cx = mLeft + (i + 0.5) * dayW
    const y = baseline - (d.practice_count / maxPractice) * chartH
    return `${cx},${y}`
  })

  return (
    <div style={{ width: '100%' }}>
      <Space size="large" style={{ marginBottom: 8 }}>
        <Space size={6}>
          <span style={{ display: 'inline-block', width: 12, height: 12, background: focusColor, borderRadius: 2 }} />
          <Text type="secondary" style={{ fontSize: 13 }}>专注分钟</Text>
        </Space>
        <Space size={6}>
          <span style={{ display: 'inline-block', width: 12, height: 3, background: practiceColor }} />
          <Text type="secondary" style={{ fontSize: 13 }}>练习题数</Text>
        </Space>
      </Space>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <line
            key={t}
            x1={mLeft}
            x2={W - mRight}
            y1={baseline - t * chartH}
            y2={baseline - t * chartH}
            stroke="#f0f0f0"
            strokeWidth={1}
          />
        ))}
        {/* focus bars */}
        {days.map((d, i) => {
          const cx = mLeft + (i + 0.5) * dayW
          const bh = (d.focus_minutes / maxFocus) * chartH
          const y = baseline - bh
          return (
            <g key={`bar-${i}`}>
              <rect
                x={cx - barW / 2}
                y={y}
                width={barW}
                height={Math.max(0, bh)}
                rx={3}
                fill={focusColor}
                opacity={0.9}
              />
              {d.focus_minutes > 0 && (
                <text x={cx} y={y - 6} textAnchor="middle" fontSize={11} fill="#4b5563">
                  {d.focus_minutes}
                </text>
              )}
            </g>
          )
        })}
        {/* practice line */}
        {linePoints.length > 1 && (
          <polyline
            points={linePoints.join(' ')}
            fill="none"
            stroke={practiceColor}
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}
        {days.map((d, i) => {
          const cx = mLeft + (i + 0.5) * dayW
          const y = baseline - (d.practice_count / maxPractice) * chartH
          return (
            <g key={`pt-${i}`}>
              <circle cx={cx} cy={y} r={3.5} fill="#fff" stroke={practiceColor} strokeWidth={2} />
              {d.practice_count > 0 && (
                <text x={cx} y={y - 8} textAnchor="middle" fontSize={10} fill={practiceColor} fontWeight={600}>
                  {d.practice_count}
                </text>
              )}
            </g>
          )
        })}
        {/* x labels */}
        {days.map((d, i) => {
          const cx = mLeft + (i + 0.5) * dayW
          return (
            <text key={`x-${i}`} x={cx} y={baseline + 18} textAnchor="middle" fontSize={11} fill="#9ca3af">
              {d.weekday || dayjs(d.date).format('ddd')}
            </text>
          )
        })}
        {/* axis labels */}
        <text x={mLeft} y={mTop - 8} fontSize={10} fill="#9ca3af">
          {maxFocus}分
        </text>
        <text x={W - mRight} y={mTop - 8} fontSize={10} fill="#9ca3af" textAnchor="end">
          {maxPractice}题
        </text>
      </svg>
    </div>
  )
}

/* ---------------- 引擎分布：SVG 环形图 ---------------- */
function EngineDonut({ breakdown }: { breakdown: { engine: string; minutes: number }[] }) {
  const total = breakdown.reduce((s, e) => s + e.minutes, 0)
  const cx = 120
  const cy = 120
  const r = 80
  const C = 2 * Math.PI * r
  let cumulative = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <svg width={240} height={240} viewBox="0 0 240 240">
        <g transform={`rotate(-90 ${cx} ${cy})`}>
          {total > 0 &&
            breakdown.map((e) => {
              const frac = e.minutes / total
              const dash = frac * C
              const offset = -cumulative * C
              cumulative += frac
              const color = ENGINE_COLORS[e.engine] ?? '#8c8c8c'
              return (
                <circle
                  key={e.engine}
                  cx={cx}
                  cy={cy}
                  r={r}
                  fill="none"
                  stroke={color}
                  strokeWidth={28}
                  strokeDasharray={`${dash} ${C - dash}`}
                  strokeDashoffset={offset}
                />
              )
            })}
        </g>
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={13} fill="#8c8c8c">
          总计
        </text>
        <text x={cx} y={cy + 18} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1f2937">
          {total}
        </text>
        <text x={cx} y={cy + 36} textAnchor="middle" fontSize={11} fill="#9ca3af">
          分钟
        </text>
      </svg>
      <div style={{ flex: 1, minWidth: 140 }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>
          {breakdown.map((e) => {
            const frac = total > 0 ? (e.minutes / total) * 100 : 0
            const color = ENGINE_COLORS[e.engine] ?? '#8c8c8c'
            return (
              <div key={e.engine}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <Space size={6}>
                    <span style={{ display: 'inline-block', width: 10, height: 10, background: color, borderRadius: 2 }} />
                    <Text style={{ fontSize: 13 }}>{ENGINE_LABELS[e.engine] ?? e.engine}</Text>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {e.minutes}分 · {Math.round(frac)}%
                  </Text>
                </div>
              </div>
            )
          })}
        </Space>
      </div>
    </div>
  )
}

/* ---------------- 洞察卡 ---------------- */
function InsightsCard({ metrics }: { metrics: Record<string, number> }) {
  const insights: { tone: string; text: string }[] = []

  const focusMin = metrics['focus_minutes'] ?? 0
  if (focusMin > 0) {
    insights.push({ tone: 'blue', text: `你的深度专注已达 ${focusMin} 分钟，继续积累心流。` })
  }

  const nodes = metrics['knowledge_nodes'] ?? 0
  const actionsDone = metrics['action_plans_done'] ?? 0
  if (nodes > 0 && actionsDone === 0) {
    insights.push({ tone: 'orange', text: `知行断裂度较高：已积累 ${nodes} 个知识节点，却尚未完成行动计划，建议用「知行转化」拆解为 7 天行动。` })
  } else if (nodes > 0 && actionsDone > 0) {
    insights.push({ tone: 'green', text: `已将 ${nodes} 个知识节点转化为 ${actionsDone} 个行动，知行闭环良好。` })
  }

  const streak = metrics['streak_days'] ?? 0
  if (streak > 0) {
    insights.push({ tone: 'gold', text: `已连续学习 ${streak} 天，保持节奏就是复利。` })
  }

  const practice = metrics['practice_correct'] ?? 0
  if (practice > 0) {
    insights.push({ tone: 'green', text: `累计答对 ${practice} 题，间隔重复正在巩固长期记忆。` })
  }

  if (insights.length === 0) {
    return null
  }

  const toneColor: Record<string, string> = {
    blue: '#e6f4ff',
    orange: '#fff7e6',
    green: '#f6ffed',
    gold: '#fffbe6',
  }
  const toneBorder: Record<string, string> = {
    blue: '#bae0ff',
    orange: '#ffd591',
    green: '#b7eb8f',
    gold: '#ffe58f',
  }

  return (
    <Card title="方法论洞察" style={{ marginTop: 24 }}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        {insights.map((ins, i) => (
          <div
            key={i}
            style={{
              background: toneColor[ins.tone] ?? '#f5f5f5',
              border: `1px solid ${toneBorder[ins.tone] ?? '#d9d9d9'}`,
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            <Space align="start">
              <BulbOutlined style={{ color: '#faad14', marginTop: 3 }} />
              <Text style={{ fontSize: 13 }}>{ins.text}</Text>
            </Space>
          </div>
        ))}
      </Space>
      <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
        洞察基于你的累计指标自动生成。知行断裂度 = 知识积累 ÷ 行动转化，比值越高越需要警惕“只学不做”。
      </Paragraph>
    </Card>
  )
}
