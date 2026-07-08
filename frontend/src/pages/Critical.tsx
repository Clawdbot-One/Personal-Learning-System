import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  Empty,
  Input,
  List,
  Progress,
  Radio,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import { ScanOutlined, BulbOutlined, QuestionCircleOutlined, WarningOutlined } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { CriticalAnalysisOut } from '../api/types'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography

const MODE_OPTIONS: { label: string; value: string; desc: string }[] = [
  { label: '海绵式（吸收）', value: 'sponge', desc: '尽力吸收作者观点与理由' },
  { label: '淘金式（批判）', value: 'panning', desc: '主动提问，淘洗出可信的论证' },
]

const CHECKLIST: { title: string; desc: string }[] = [
  { title: '1. 论题与结论', desc: '作者在讨论什么？主张的核心结论是什么？' },
  { title: '2. 理由', desc: '支持结论的理由有哪些？是否充分？' },
  { title: '3. 歧义词', desc: '哪些关键词含义模糊？是否影响论证？' },
  { title: '4. 隐含假设', desc: '论证依赖了哪些未明说的假设？' },
  { title: '5. 逻辑谬误', desc: '推理过程中是否存在谬误或诡辩？' },
  { title: '6. 证据效力', desc: '证据来源、类型与可靠性如何？' },
  { title: '7. 替代原因', desc: '是否有其他原因能解释同样的现象？' },
  { title: '8. 数据欺骗', desc: '数据是否被选择性使用或误导性呈现？' },
  { title: '9. 省略信息', desc: '有哪些被省略的重要信息？' },
  { title: '10. 合理结论', desc: '基于理由能得出哪些不同的结论？' },
  { title: '11. 综合可信度', desc: '综合以上判断整体论证的可信度。' },
]

// Safe field extractors for unknown objects
function getField(obj: unknown, key: string): unknown {
  if (obj && typeof obj === 'object') {
    return (obj as Record<string, unknown>)[key]
  }
  return undefined
}
function strField(obj: unknown, key: string): string {
  const v = getField(obj, key)
  return typeof v === 'string' ? v : v == null ? '' : String(v)
}
function numField(obj: unknown, key: string): number {
  const v = getField(obj, key)
  return typeof v === 'number' ? v : 0
}

function credibilityColor(score: number): string {
  if (score >= 0.7) return '#10b981'
  if (score >= 0.4) return '#f59e0b'
  return '#ef4444'
}

export default function Critical() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [sourceText, setSourceText] = useState('')
  const [mode, setMode] = useState('panning')
  const [current, setCurrent] = useState<CriticalAnalysisOut | null>(null)

  const analyzeMutation = useMutation({
    mutationFn: (vars: { source_text: string; mode: string }) =>
      api.analyze({ source_text: vars.source_text, mode: vars.mode }),
    onSuccess: (result) => {
      setCurrent(result)
      message.success('分析完成')
      queryClient.invalidateQueries({ queryKey: ['analyses'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '分析失败')
    },
  })

  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['analyses'],
    queryFn: () => api.listAnalyses(30),
  })

  function handleAnalyze() {
    if (!sourceText.trim()) {
      message.warning('请先粘贴要分析的文本')
      return
    }
    analyzeMutation.mutate({ source_text: sourceText, mode })
  }

  const reasons = (current?.reasons ?? []) as unknown[]
  const ambiguous = (current?.ambiguous_terms ?? []) as unknown[]
  const assumptions = (current?.assumptions ?? []) as unknown[]
  const fallacies = (current?.fallacies ?? []) as unknown[]
  const evidence = (current?.evidence_levels ?? []) as unknown[]

  return (
    <div className="lf-page">
      <Title level={3} style={{ marginBottom: 24 }}>
        <ScanOutlined style={{ marginRight: 8 }} />
        批判思维 · 论证分析
      </Title>

      <Row gutter={24}>
        {/* Input + result */}
        <Col xs={24} lg={16}>
          <Card title="待分析文本">
            <Radio.Group
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ marginBottom: 12 }}
            >
              {MODE_OPTIONS.map((m) => (
                <Radio.Button key={m.value} value={m.value}>
                  {m.label}
                </Radio.Button>
              ))}
            </Radio.Group>
            <Text type="secondary" style={{ display: 'block', marginBottom: 8, fontSize: 12 }}>
              {MODE_OPTIONS.find((m) => m.value === mode)?.desc}
            </Text>
            <Input.TextArea
              rows={8}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="粘贴文章、社论、广告文案等含论证的文本，系统将拆解为结论、理由、歧义词、假设、谬误、证据…"
            />
            <Button
              type="primary"
              icon={<ScanOutlined />}
              loading={analyzeMutation.isPending}
              onClick={handleAnalyze}
              style={{ marginTop: 12 }}
            >
              开始分析
            </Button>
          </Card>

          {/* Result */}
          {analyzeMutation.isPending && (
            <Card style={{ marginTop: 16, textAlign: 'center' }}>
              <Spin tip="正在分析论证结构…" />
            </Card>
          )}

          {current && !analyzeMutation.isPending && (
            <div style={{ marginTop: 16 }}>
              {/* Credibility score */}
              <Card style={{ marginBottom: 16, textAlign: 'center' }}>
                <Text type="secondary">综合可信度评分</Text>
                <div style={{ fontSize: 36, fontWeight: 700, color: credibilityColor(current.credibility_score), margin: '4px 0' }}>
                  {Math.round(current.credibility_score * 100)}%
                </div>
                <Progress
                  percent={Math.round(current.credibility_score * 100)}
                  showInfo={false}
                  strokeColor={credibilityColor(current.credibility_score)}
                  style={{ maxWidth: 360, margin: '0 auto' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  模式：{MODE_OPTIONS.find((m) => m.value === current.mode)?.label ?? current.mode}
                  {' · '}{dayjs(current.created_at).format('YYYY-MM-DD HH:mm')}
                </Text>
              </Card>

              {/* Conclusion */}
              {current.conclusion && (
                <Card
                  title={<span><BulbOutlined style={{ marginRight: 8 }} />结论</span>}
                  style={{ marginBottom: 16 }}
                >
                  <div style={{ background: '#eff6ff', borderLeft: '4px solid #2563eb', padding: '8px 12px', borderRadius: 4 }}>
                    <Paragraph style={{ margin: 0, fontWeight: 600 }}>{current.conclusion}</Paragraph>
                  </div>
                </Card>
              )}

              <Row gutter={16}>
                {/* Reasons */}
                <Col xs={24} md={12}>
                  <Card title="理由" size="small" style={{ marginBottom: 16, height: '100%' }}>
                    {reasons.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无" />
                    ) : (
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {reasons.map((r, i) => (
                          <li key={i} style={{ marginBottom: 6, fontSize: 13, color: '#374151' }}>
                            {strField(r, 'text') || strField(r, 'content') || strField(r, 'reason') || JSON.stringify(r)}
                          </li>
                        ))}
                      </ol>
                    )}
                  </Card>
                </Col>

                {/* Ambiguous terms */}
                <Col xs={24} md={12}>
                  <Card title="歧义词" size="small" style={{ marginBottom: 16, height: '100%' }}>
                    {ambiguous.length === 0 ? (
                      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无" />
                    ) : (
                      <Space wrap>
                        {ambiguous.map((t, i) => (
                          <Tag key={i} color="orange">
                            {strField(t, 'term') || strField(t, 'word') || strField(t, 'text') || JSON.stringify(t)}
                          </Tag>
                        ))}
                      </Space>
                    )}
                  </Card>
                </Col>
              </Row>

              {/* Assumptions */}
              {assumptions.length > 0 && (
                <Card
                  title={<span><WarningOutlined style={{ marginRight: 8 }} />隐含假设</span>}
                  size="small"
                  style={{ marginBottom: 16 }}
                >
                  <List
                    size="small"
                    dataSource={assumptions}
                    renderItem={(a, i) => (
                      <List.Item>
                        <div style={{ background: '#fffbeb', padding: '6px 10px', borderRadius: 4, width: '100%', fontSize: 13 }}>
                          {strField(a, 'text') || strField(a, 'content') || strField(a, 'assumption') || JSON.stringify(a)}
                        </div>
                      </List.Item>
                    )}
                  />
                </Card>
              )}

              {/* Fallacies */}
              {fallacies.length > 0 && (
                <Card title="逻辑谬误" size="small" style={{ marginBottom: 16 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {fallacies.map((f, i) => (
                      <Alert
                        key={i}
                        type="error"
                        showIcon
                        message={
                          <Space>
                            <Tag color="red">{strField(f, 'code') || `#${i + 1}`}</Tag>
                            <Text strong>{strField(f, 'name') || '未命名谬误'}</Text>
                          </Space>
                        }
                        description={
                          <div style={{ fontSize: 13 }}>
                            {strField(f, 'snippet') && (
                              <Paragraph style={{ margin: '4px 0', color: '#6b7280', fontStyle: 'italic' }}>
                                「{strField(f, 'snippet')}」
                              </Paragraph>
                            )}
                            {strField(f, 'explanation') && (
                              <Paragraph style={{ margin: '4px 0 0' }}>
                                {strField(f, 'explanation')}
                              </Paragraph>
                            )}
                          </div>
                        }
                      />
                    ))}
                  </Space>
                </Card>
              )}

              {/* Evidence levels */}
              {evidence.length > 0 && (
                <Card title="证据分级" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {evidence.map((e, i) => {
                      const reliability = numField(e, 'reliability')
                      return (
                        <div key={i} style={{ padding: '6px 0' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Tag color="blue">{strField(e, 'type') || `证据 ${i + 1}`}</Tag>
                            <Text type="secondary" style={{ fontSize: 12 }}>可靠性 {Math.round(reliability * 100)}%</Text>
                          </div>
                          <Progress percent={Math.round(reliability * 100)} showInfo={false} size="small" strokeColor={credibilityColor(reliability)} />
                          {strField(e, 'note') && (
                            <Text type="secondary" style={{ fontSize: 12 }}>{strField(e, 'note')}</Text>
                          )}
                        </div>
                      )
                    })}
                  </Space>
                </Card>
              )}
            </div>
          )}
        </Col>

        {/* Side: history + methodology */}
        <Col xs={24} lg={8}>
          <Card title="历史分析" style={{ marginBottom: 16 }}>
            {historyLoading ? (
              <div style={{ textAlign: 'center', padding: 16 }}><Spin /></div>
            ) : !history || history.length === 0 ? (
              <Empty description="还没有分析记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={history}
                style={{ maxHeight: 280, overflow: 'auto' }}
                renderItem={(a) => (
                  <List.Item
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setCurrent(a)
                      setSourceText(a.source_text)
                      setMode(a.mode)
                    }}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={MODE_OPTIONS.find((m) => m.value === a.mode) ? 'blue' : 'default'} style={{ fontSize: 11 }}>
                          {MODE_OPTIONS.find((m) => m.value === a.mode)?.label ?? a.mode}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>{dayjs(a.created_at).format('MM-DD HH:mm')}</Text>
                      </div>
                      <Text ellipsis style={{ fontSize: 12, color: '#374151' }}>
                        {a.source_text.slice(0, 40) || '（空文本）'}
                      </Text>
                    </div>
                  </List.Item>
                )}
              />
            )}
          </Card>

          <Card title={<span><QuestionCircleOutlined style={{ marginRight: 8 }} />批判提问 11 步清单</span>}>
            <Paragraph type="secondary" style={{ marginBottom: 12, fontSize: 12 }}>
              源自《学会提问》—— 逐项拷问，避免被论证裹挟。
            </Paragraph>
            <Space direction="vertical" size={6} style={{ width: '100%' }}>
              {CHECKLIST.map((c) => (
                <div key={c.title} style={{ fontSize: 12 }}>
                  <Text strong style={{ fontSize: 12 }}>{c.title}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}> · {c.desc}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
