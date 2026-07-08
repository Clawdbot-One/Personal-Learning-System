import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  App,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Slider,
  Space,
  Spin,
  Switch,
  Tag,
  Typography,
} from 'antd'
import { PlusOutlined, DeleteOutlined, ApartmentOutlined, ShareAltOutlined } from '@ant-design/icons'
import { api, ApiError } from '../api/client'
import type { KnowledgeNodeOut } from '../api/types'

const { Title, Text, Paragraph } = Typography

const RELATION_OPTIONS: { label: string; value: string }[] = [
  { label: '前置 (prerequisite)', value: 'prerequisite' },
  { label: '包含 (contains)', value: 'contains' },
  { label: '相关 (related)', value: 'related' },
  { label: '应用 (applied_to)', value: 'applied_to' },
]

const SVG_W = 600
const SVG_H = 400
const CENTER_X = SVG_W / 2
const CENTER_Y = SVG_H / 2
const RADIUS = 140

interface NodeFormValues {
  concept: string
  description?: string
  category?: string
  mastery: number
  is_weak: boolean
}

interface EdgeFormValues {
  source_id: string
  target_id: string
  relation_type: string
  strength: number
}

function masteryColor(mastery: number): string {
  if (mastery >= 0.66) return '#10b981' // green
  if (mastery >= 0.33) return '#f59e0b' // yellow
  return '#ef4444' // red
}

export default function KnowledgeGraph() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [edgeModalOpen, setEdgeModalOpen] = useState(false)
  const [nodeForm] = Form.useForm<NodeFormValues>()
  const [edgeForm] = Form.useForm<EdgeFormValues>()

  const { data: graph, isLoading } = useQuery({
    queryKey: ['graph'],
    queryFn: api.knowledgeGraph,
  })

  const addNodeMutation = useMutation({
    mutationFn: (values: NodeFormValues) =>
      api.addNode({
        concept: values.concept,
        description: values.description,
        category: values.category,
        mastery: values.mastery,
        is_weak: values.is_weak,
      }),
    onSuccess: () => {
      message.success('节点已添加')
      setNodeModalOpen(false)
      nodeForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  const addEdgeMutation = useMutation({
    mutationFn: (values: EdgeFormValues) =>
      api.addEdge({
        source_id: values.source_id,
        target_id: values.target_id,
        relation_type: values.relation_type,
        strength: values.strength,
      }),
    onSuccess: () => {
      message.success('关系已添加')
      setEdgeModalOpen(false)
      edgeForm.resetFields()
      queryClient.invalidateQueries({ queryKey: ['graph'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '添加失败')
    },
  })

  const deleteNodeMutation = useMutation({
    mutationFn: (id: string) => api.deleteNode(id),
    onSuccess: () => {
      message.success('节点已删除')
      setSelectedId(null)
      queryClient.invalidateQueries({ queryKey: ['graph'] })
    },
    onError: (e) => {
      const err = e as ApiError
      message.error(typeof err.detail === 'string' ? err.detail : '删除失败')
    },
  })

  // Compute circle layout positions
  const positions = useMemo(() => {
    const nodes = graph?.nodes ?? []
    const map: Record<string, { x: number; y: number }> = {}
    const n = nodes.length
    nodes.forEach((node, i) => {
      if (n === 1) {
        map[node.id] = { x: CENTER_X, y: CENTER_Y }
      } else {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2
        map[node.id] = {
          x: CENTER_X + RADIUS * Math.cos(angle),
          y: CENTER_Y + RADIUS * Math.sin(angle),
        }
      }
    })
    return map
  }, [graph?.nodes])

  const nodeById = useMemo(() => {
    const map: Record<string, KnowledgeNodeOut> = {}
    ;(graph?.nodes ?? []).forEach((n) => (map[n.id] = n))
    return map
  }, [graph?.nodes])

  const selectedNode = selectedId ? nodeById[selectedId] : null

  if (isLoading) {
    return (
      <div className="lf-page" style={{ textAlign: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  const nodes = graph?.nodes ?? []
  const edges = graph?.edges ?? []

  return (
    <div className="lf-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <Title level={3} style={{ margin: 0 }}>
          <ApartmentOutlined style={{ marginRight: 8 }} />
          知识图谱
        </Title>
        <Space>
          <Button icon={<PlusOutlined />} onClick={() => setNodeModalOpen(true)}>新增节点</Button>
          <Button icon={<ShareAltOutlined />} onClick={() => setEdgeModalOpen(true)}>添加关系</Button>
        </Space>
      </div>

      <Row gutter={24}>
        {/* SVG visualization */}
        <Col xs={24} lg={15}>
          <Card title="图谱视图" extra={<Text type="secondary" style={{ fontSize: 12 }}>{nodes.length} 节点 · {edges.length} 关系</Text>}>
            {nodes.length === 0 ? (
              <Empty description="还没有知识节点，点击右上角添加" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} style={{ maxWidth: SVG_W, margin: '0 auto', display: 'block' }}>
                {/* Edges */}
                {edges.map((e) => {
                  const s = positions[e.source_id]
                  const t = positions[e.target_id]
                  if (!s || !t) return null
                  const isHighlighted = selectedId === e.source_id || selectedId === e.target_id
                  return (
                    <line
                      key={e.id}
                      x1={s.x}
                      y1={s.y}
                      x2={t.x}
                      y2={t.y}
                      stroke={isHighlighted ? '#2563eb' : '#d1d5db'}
                      strokeWidth={isHighlighted ? 2 : 1}
                      strokeOpacity={selectedId && !isHighlighted ? 0.3 : 0.8}
                    />
                  )
                })}
                {/* Nodes */}
                {nodes.map((node) => {
                  const pos = positions[node.id]
                  if (!pos) return null
                  const isSelected = selectedId === node.id
                  const dim = selectedId && !isSelected && !(edges.some((e) => (e.source_id === selectedId && e.target_id === node.id) || (e.target_id === selectedId && e.source_id === node.id)))
                  const r = 18
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${pos.x}, ${pos.y})`}
                      style={{ cursor: 'pointer', opacity: dim ? 0.35 : 1 }}
                      onClick={() => setSelectedId(isSelected ? null : node.id)}
                    >
                      <circle
                        r={r}
                        fill={masteryColor(node.mastery)}
                        fillOpacity={0.25}
                        stroke={isSelected ? '#2563eb' : masteryColor(node.mastery)}
                        strokeWidth={isSelected ? 3 : 2}
                        strokeDasharray={node.is_weak ? '4 3' : undefined}
                      />
                      <text
                        y={r + 12}
                        textAnchor="middle"
                        fontSize={11}
                        fill={isSelected ? '#2563eb' : '#374151'}
                        fontWeight={isSelected ? 700 : 400}
                      >
                        {node.concept.length > 8 ? node.concept.slice(0, 8) + '…' : node.concept}
                      </text>
                    </g>
                  )
                })}
              </svg>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#6b7280' }}>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#10b981', borderRadius: '50%', marginRight: 4 }} />高掌握</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#f59e0b', borderRadius: '50%', marginRight: 4 }} />中等</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, background: '#ef4444', borderRadius: '50%', marginRight: 4 }} />低掌握</span>
              <span><span style={{ display: 'inline-block', width: 10, height: 10, border: '1.5px dashed #ef4444', borderRadius: '50%', marginRight: 4 }} />薄弱节点</span>
            </div>
          </Card>
        </Col>

        {/* Node list panel */}
        <Col xs={24} lg={9}>
          <Card
            title="节点列表"
            style={{ height: '100%' }}
            extra={
              selectedNode && (
                <Popconfirm
                  title="确定删除该节点？相关关系也会被移除"
                  okText="删除"
                  cancelText="取消"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => deleteNodeMutation.mutate(selectedNode.id)}
                >
                  <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
                </Popconfirm>
              )
            }
          >
            {nodes.length === 0 ? (
              <Empty description="暂无节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={nodes}
                style={{ maxHeight: 480, overflow: 'auto' }}
                renderItem={(node) => (
                  <List.Item
                    style={{
                      cursor: 'pointer',
                      background: selectedId === node.id ? '#eff6ff' : undefined,
                      padding: '8px 12px',
                    }}
                    onClick={() => setSelectedId(node.id)}
                  >
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong style={{ fontSize: 13 }}>{node.concept}</Text>
                        {node.is_weak && <Tag color="red" style={{ fontSize: 11 }}>薄弱</Tag>}
                      </div>
                      <div style={{ marginTop: 4 }}>
                        {node.category && <Tag style={{ fontSize: 11 }}>{node.category}</Tag>}
                      </div>
                      <Progress
                        percent={Math.round(node.mastery * 100)}
                        size="small"
                        strokeColor={masteryColor(node.mastery)}
                        style={{ marginTop: 4, marginBottom: 0 }}
                      />
                    </div>
                  </List.Item>
                )}
              />
            )}
            {selectedNode && (
              <div style={{ marginTop: 16, padding: 12, background: '#f9fafb', borderRadius: 6 }}>
                <Text strong>{selectedNode.concept}</Text>
                {selectedNode.description && (
                  <Paragraph style={{ marginTop: 6, marginBottom: 0, fontSize: 13, color: '#6b7280' }}>
                    {selectedNode.description}
                  </Paragraph>
                )}
                <div style={{ marginTop: 8, fontSize: 12, color: '#9ca3af' }}>
                  掌握度 {Math.round(selectedNode.mastery * 100)}% · {selectedNode.is_weak ? '薄弱节点' : '已掌握'}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Add node modal */}
      <Modal
        title="新增知识节点"
        open={nodeModalOpen}
        onCancel={() => setNodeModalOpen(false)}
        onOk={() => nodeForm.validateFields().then((v) => addNodeMutation.mutate(v))}
        confirmLoading={addNodeMutation.isPending}
        okText="添加"
        cancelText="取消"
      >
        <Form form={nodeForm} layout="vertical" initialValues={{ mastery: 0.3, is_weak: false }}>
          <Form.Item name="concept" label="概念名称" rules={[{ required: true, message: '请输入概念名称' }]}>
            <Input placeholder="例如：闭包" />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={2} placeholder="概念说明（可选）" />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="例如：编程语言" />
          </Form.Item>
          <Form.Item name="mastery" label="掌握度">
            <Slider min={0} max={1} step={0.05} marks={{ 0: '0', 0.5: '中', 1: '1' }} />
          </Form.Item>
          <Form.Item name="is_weak" label="标记为薄弱节点" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add edge modal */}
      <Modal
        title="添加关系"
        open={edgeModalOpen}
        onCancel={() => setEdgeModalOpen(false)}
        onOk={() => edgeForm.validateFields().then((v) => addEdgeMutation.mutate(v))}
        confirmLoading={addEdgeMutation.isPending}
        okText="添加"
        cancelText="取消"
      >
        <Form form={edgeForm} layout="vertical" initialValues={{ relation_type: 'related', strength: 0.5 }}>
          <Form.Item name="source_id" label="起点节点" rules={[{ required: true, message: '请选择起点' }]}>
            <Select
              placeholder="选择起点节点"
              options={nodes.map((n) => ({ label: n.concept, value: n.id }))}
            />
          </Form.Item>
          <Form.Item name="target_id" label="终点节点" rules={[{ required: true, message: '请选择终点' }]}>
            <Select
              placeholder="选择终点节点"
              options={nodes.map((n) => ({ label: n.concept, value: n.id }))}
            />
          </Form.Item>
          <Form.Item name="relation_type" label="关系类型">
            <Select options={RELATION_OPTIONS} />
          </Form.Item>
          <Form.Item name="strength" label="强度">
            <Slider min={0} max={1} step={0.05} marks={{ 0: '0', 0.5: '中', 1: '1' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
