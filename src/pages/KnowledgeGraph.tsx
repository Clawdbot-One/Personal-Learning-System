/**
 * 知识图谱页 —— 刻意练习引擎：心理表征构建
 * 将零散概念构建为可视化知识网络，节点 = 概念，连线 = 概念间关联。
 */
import { useEffect, useRef, useState } from 'react'
import { Network, Plus, Trash2, Link2, Brain, Search, Pencil, Loader2 } from 'lucide-react'
import { Card, EmptyState, PageHeader, Modal, Skeleton, StatCard, ProgressBar } from '@/components/ui'
import { knowledgeApi } from '@/lib/api'
import { useAuthStore, toast } from '@/store/auth'
import type { KnowledgeNode, KnowledgeLink } from '@/lib/types'

const VIEW_W = 800
const VIEW_H = 500
const CATEGORIES = ['概念', '技能', '方法', '原理', '工具', '其他']
const PRACTICE = '#7c3aed' // engine.practice 紫

interface NodeForm {
  concept: string
  description: string
  category: string
  mastery_level: number // 0-100
  importance: number // 0-100
}
const DEFAULT_FORM: NodeForm = { concept: '', description: '', category: '概念', mastery_level: 30, importance: 50 }

/** 掌握度 0-1 → 灰到紫渐变 */
function masteryColor(mastery: number): string {
  const m = Math.max(0, Math.min(1, mastery))
  const r = Math.round(0x9a + (0x7c - 0x9a) * m)
  const g = Math.round(0xa3 + (0x3a - 0xa3) * m)
  const b = Math.round(0xb2 + (0xed - 0xb2) * m)
  return `rgb(${r}, ${g}, ${b})`
}

/** 重要度 0-1 → 半径 16-32 */
function importanceRadius(importance: number): number {
  return 16 + Math.max(0, Math.min(1, importance)) * 16
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// ============ 力导向可视化子组件 ============
interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  fx: number | null
  fy: number | null
}

interface GraphCanvasProps {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
  selectedId: string | null
  connectingFromId: string | null
  onSelect: (id: string) => void
  onConnectTarget: (sourceId: string, targetId: string) => void
}

function GraphCanvas({ nodes, links, selectedId, connectingFromId, onSelect, onConnectTarget }: GraphCanvasProps) {
  const simRef = useRef<Record<string, SimNode>>({})
  const frameRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const draggingRef = useRef<string | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [, setTick] = useState(0)
  const [hoverId, setHoverId] = useState<string | null>(null)

  // 初始化新节点位置 + 重启物理模拟（节点/关系变化时）
  useEffect(() => {
    const sim = simRef.current
    nodes.forEach((n, i) => {
      if (!sim[n.id]) {
        const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2
        const r = 90 + Math.random() * 70
        sim[n.id] = {
          id: n.id,
          x: VIEW_W / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 50,
          y: VIEW_H / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 50,
          vx: 0, vy: 0, fx: null, fy: null,
        }
      }
    })
    Object.keys(sim).forEach((id) => {
      if (!nodes.find((n) => n.id === id)) delete sim[id]
    })

    frameRef.current = 0
    if (rafRef.current) cancelAnimationFrame(rafRef.current)

    const step = () => {
      const dragging = !!draggingRef.current
      if (!dragging && frameRef.current < 200) {
        const sim = simRef.current
        const ids = Object.keys(sim)
        // 节点间斥力（距离反比）
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            const a = sim[ids[i]], b = sim[ids[j]]
            let dx = b.x - a.x, dy = b.y - a.y
            let dist = Math.sqrt(dx * dx + dy * dy) || 0.01
            const force = 3200 / (dist * dist)
            const fx = (dx / dist) * force
            const fy = (dy / dist) * force
            a.vx -= fx; a.vy -= fy
            b.vx += fx; b.vy += fy
          }
        }
        // 连线引力（距离正比，受 strength 调节）
        links.forEach((link) => {
          const a = sim[link.source], b = sim[link.target]
          if (!a || !b) return
          let dx = b.x - a.x, dy = b.y - a.y
          let dist = Math.sqrt(dx * dx + dy * dy) || 0.01
          const rest = 130
          const force = (dist - rest) * 0.025 * (0.5 + (link.strength || 0.5))
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force
          a.vx += fx; a.vy += fy
          b.vx -= fx; b.vy -= fy
        })
        // 中心引力 + 阻尼积分
        ids.forEach((id) => {
          const n = sim[id]
          if (n.fx != null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; return }
          n.vx += (VIEW_W / 2 - n.x) * 0.006
          n.vy += (VIEW_H / 2 - n.y) * 0.006
          n.vx *= 0.85; n.vy *= 0.85
          n.vx = Math.max(-12, Math.min(12, n.vx))
          n.vy = Math.max(-12, Math.min(12, n.vy))
          n.x += n.vx; n.y += n.vy
          n.x = Math.max(40, Math.min(VIEW_W - 40, n.x))
          n.y = Math.max(40, Math.min(VIEW_H - 40, n.y))
        })
        frameRef.current++
      }
      setTick((t) => t + 1)
      if (frameRef.current < 200 || dragging) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
      }
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [nodes, links])

  const clientToSvg = (cx: number, cy: number) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const rect = svg.getBoundingClientRect()
    return {
      x: ((cx - rect.left) / rect.width) * VIEW_W,
      y: ((cy - rect.top) / rect.height) * VIEW_H,
    }
  }

  const handleNodeMouseDown = (e: React.MouseEvent, node: KnowledgeNode) => {
    e.stopPropagation()
    e.preventDefault()
    if (connectingFromId) {
      if (connectingFromId !== node.id) onConnectTarget(connectingFromId, node.id)
      return
    }
    onSelect(node.id)
    draggingRef.current = node.id
    const pos = clientToSvg(e.clientX, e.clientY)
    const s = simRef.current[node.id]
    if (s) { s.fx = pos.x; s.fy = pos.y; s.vx = 0; s.vy = 0 }
    setTick((t) => t + 1)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingRef.current) return
    const pos = clientToSvg(e.clientX, e.clientY)
    const s = simRef.current[draggingRef.current]
    if (s) { s.fx = pos.x; s.fy = pos.y }
    setTick((t) => t + 1)
  }

  const handleMouseUp = () => {
    if (draggingRef.current) {
      const s = simRef.current[draggingRef.current]
      if (s) { s.fx = null; s.fy = null }
      draggingRef.current = null
    }
  }

  const sim = simRef.current
  const hoverNode = hoverId ? nodes.find((n) => n.id === hoverId) : null
  const hoverPos = hoverId ? sim[hoverId] : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: '100%', height: 500, display: 'block', cursor: draggingRef.current ? 'grabbing' : 'default', touchAction: 'none' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 连线 */}
      {links.map((link) => {
        const a = sim[link.source], b = sim[link.target]
        if (!a || !b) return null
        const opacity = 0.12 + (link.strength || 0.5) * 0.6
        return (
          <line key={link.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={PRACTICE} strokeWidth={1.5} strokeOpacity={opacity} pointerEvents="none" />
        )
      })}

      {/* 节点 */}
      {nodes.map((node) => {
        const p = sim[node.id]
        if (!p) return null
        const r = importanceRadius(node.importance)
        const fill = masteryColor(node.mastery_level)
        const isSelected = node.id === selectedId
        const isConnecting = node.id === connectingFromId
        return (
          <g key={node.id} style={{ cursor: 'pointer' }}
            onMouseDown={(e) => handleNodeMouseDown(e, node)}
            onMouseEnter={() => setHoverId(node.id)}
            onMouseLeave={() => setHoverId(null)}>
            {(isSelected || isConnecting) && (
              <circle cx={p.x} cy={p.y} r={r + 6} fill="none"
                stroke={isConnecting ? '#f59e0b' : '#2563eb'} strokeWidth={2} strokeOpacity={0.7} />
            )}
            <circle cx={p.x} cy={p.y} r={r} fill={fill} stroke="#fff" strokeWidth={2} />
            <text x={p.x} y={p.y + r + 14} textAnchor="middle" fontSize={12} fill="#272d40" fontWeight={500} pointerEvents="none">
              {truncate(node.concept, 10)}
            </text>
          </g>
        )
      })}

      {/* 悬浮提示 */}
      {hoverNode && hoverPos && (() => {
        const w = 160, h = 46
        const tx = Math.min(VIEW_W - w - 4, Math.max(4, hoverPos.x - w / 2))
        const ty = Math.max(4, hoverPos.y - 40 - h)
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={w} height={h} rx={8} fill="#1a1f36" opacity={0.92} />
            <text x={tx + 10} y={ty + 19} fill="#fff" fontSize={12} fontWeight={600}>{truncate(hoverNode.concept, 16)}</text>
            <text x={tx + 10} y={ty + 36} fill="#9aa3b2" fontSize={11}>掌握度 {Math.round(hoverNode.mastery_level * 100)}%</text>
          </g>
        )
      })()}
    </svg>
  )
}

// ============ 主组件 ============
export default function KnowledgeGraph() {
  const { refreshUser } = useAuthStore()
  const [graph, setGraph] = useState<{ nodes: KnowledgeNode[]; links: KnowledgeLink[] }>({ nodes: [], links: [] })
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState<NodeForm>(DEFAULT_FORM)

  const loadGraph = async () => {
    try {
      setLoading(true)
      const data = await knowledgeApi.graph()
      setGraph(data)
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadGraph() }, [])

  const selectedNode = graph.nodes.find((n) => n.id === selectedId) || null
  const relatedCount = selectedId ? graph.links.filter((l) => l.source === selectedId || l.target === selectedId).length : 0

  const openAdd = () => { setEditingId(null); setForm(DEFAULT_FORM); setModalOpen(true) }
  const openEdit = (node: KnowledgeNode) => {
    setEditingId(node.id)
    setForm({
      concept: node.concept,
      description: node.description || '',
      category: CATEGORIES.includes(node.category) ? node.category : (node.category || '概念'),
      mastery_level: Math.round((node.mastery_level || 0) * 100),
      importance: Math.round((node.importance || 0) * 100),
    })
    setModalOpen(true)
  }

  const handleSubmit = async () => {
    if (!form.concept.trim()) { toast('请输入概念名', 'error'); return }
    setSubmitting(true)
    try {
      const payload = {
        concept: form.concept.trim(),
        description: form.description.trim(),
        category: form.category,
        mastery_level: form.mastery_level / 100,
        importance: form.importance / 100,
      }
      if (editingId) {
        await knowledgeApi.updateNode(editingId, payload)
        toast('节点已更新', 'success')
      } else {
        await knowledgeApi.addNode(payload)
        toast('节点已添加', 'success')
      }
      setModalOpen(false)
      await loadGraph()
      refreshUser()
    } catch (e) {
      toast((e as Error).message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该节点？相关关系也会被移除。')) return
    try {
      await knowledgeApi.removeNode(id)
      toast('节点已删除', 'success')
      setSelectedId(null)
      setConnecting(false)
      await loadGraph()
      refreshUser()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const handleConnectTarget = async (sourceId: string, targetId: string) => {
    setConnecting(false)
    try {
      await knowledgeApi.addRelation({ source_id: sourceId, target_id: targetId, relation_type: 'related', strength: 0.6 })
      toast('已建立连接', 'success')
      await loadGraph()
      refreshUser()
    } catch (e) {
      toast((e as Error).message, 'error')
    }
  }

  const updateForm = (patch: Partial<NodeForm>) => setForm((f) => ({ ...f, ...patch }))

  return (
    <div>
      <PageHeader
        title="知识图谱"
        subtitle="将零散概念构建为可视化知识网络"
        action={<button onClick={openAdd} className="lf-btn-primary"><Plus size={16} />添加节点</button>}
      />

      {/* 统计 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <StatCard icon={Brain} label="知识节点" value={graph.nodes.length} sub="已构建概念" color="brand" />
        <StatCard icon={Link2} label="概念关系" value={graph.links.length} sub="连接数" color="purple" />
      </div>

      {loading ? (
        <Skeleton className="h-[560px]" />
      ) : graph.nodes.length === 0 ? (
        <Card hover={false}>
          <EmptyState
            icon={Network}
            title="还没有知识节点"
            description="构建你的第一个知识节点，开始建立概念之间的联系，形成清晰的心理表征。"
            action={<button onClick={openAdd} className="lf-btn-primary"><Plus size={16} />添加第一个节点</button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 图谱可视化 */}
          <div className="lg:col-span-2">
            <div className="lf-card overflow-hidden">
              {connecting && (
                <div className="px-4 py-2.5 bg-gold-50 border-b border-gold-200 flex items-center gap-2 text-sm text-gold-700">
                  <Link2 size={14} /> 正在选择目标节点，点击另一节点完成连接
                  <button className="ml-auto lf-btn-ghost !py-0.5 !px-2 text-xs" onClick={() => setConnecting(false)}>取消</button>
                </div>
              )}
              <GraphCanvas
                nodes={graph.nodes}
                links={graph.links}
                selectedId={selectedId}
                connectingFromId={connecting ? selectedId : null}
                onSelect={setSelectedId}
                onConnectTarget={handleConnectTarget}
              />
              <div className="px-4 py-2 border-t border-ink-100 flex items-center justify-between text-xs text-ink-400">
                <span>拖拽节点调整位置 · 点击节点查看详情</span>
                <span className="flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-ink-300" />入门</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: PRACTICE }} />精通</span>
                </span>
              </div>
            </div>
          </div>

          {/* 详情面板 */}
          <div>
            {selectedNode ? (
              <Card hover={false}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <span className="lf-badge bg-purple-50 text-purple-700">{selectedNode.category || '未分类'}</span>
                    <h3 className="text-lg font-bold text-ink-900 mt-2 break-words">{selectedNode.concept}</h3>
                  </div>
                </div>
                {selectedNode.description ? (
                  <p className="text-sm text-ink-600 mb-4 leading-relaxed">{selectedNode.description}</p>
                ) : (
                  <p className="text-sm text-ink-400 mb-4 italic">暂无描述</p>
                )}
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink-600">掌握度</span>
                      <span className="font-medium text-ink-900">{Math.round(selectedNode.mastery_level * 100)}%</span>
                    </div>
                    <ProgressBar value={selectedNode.mastery_level * 100} color="brand" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-ink-600">重要度</span>
                      <span className="font-medium text-ink-900">{Math.round(selectedNode.importance * 100)}%</span>
                    </div>
                    <ProgressBar value={selectedNode.importance * 100} color="gold" />
                  </div>
                  <div className="text-xs text-ink-400">关联关系 {relatedCount} 条</div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className="lf-btn-secondary !py-1.5 text-sm" onClick={() => openEdit(selectedNode)}>
                    <Pencil size={14} />编辑
                  </button>
                  <button
                    className={`lf-btn-secondary !py-1.5 text-sm ${connecting ? '!bg-gold-100 !text-gold-700 !border-gold-200' : ''}`}
                    onClick={() => setConnecting((c) => !c)}
                  >
                    <Link2 size={14} />{connecting ? '取消连接' : '连接到'}
                  </button>
                  <button className="lf-btn-ghost !py-1.5 text-sm !text-red-500 hover:!bg-red-50" onClick={() => handleDelete(selectedNode.id)}>
                    <Trash2 size={14} />删除节点
                  </button>
                </div>
                {connecting && <p className="text-xs text-gold-600 mt-2">点击图谱中另一个节点完成连接</p>}
              </Card>
            ) : (
              <Card hover={false}>
                <EmptyState icon={Search} title="未选中节点" description="点击图谱中的节点查看概念详情与关联" />
              </Card>
            )}
          </div>
        </div>
      )}

      {/* 添加/编辑节点模态框 */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? '编辑节点' : '添加节点'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">概念名 <span className="text-red-500">*</span></label>
            <input className="lf-input" value={form.concept} onChange={(e) => updateForm({ concept: e.target.value })} placeholder="如：刻意练习" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">描述</label>
            <textarea className="lf-input" rows={3} value={form.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="对该概念的理解或定义" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">分类</label>
            <select className="lf-input" value={form.category} onChange={(e) => updateForm({ category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-ink-700">掌握度</label>
              <span className="text-sm text-ink-500">{form.mastery_level}%</span>
            </div>
            <input type="range" min={0} max={100} value={form.mastery_level} onChange={(e) => updateForm({ mastery_level: +e.target.value })} className="w-full accent-[#7c3aed]" />
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-sm font-medium text-ink-700">重要度</label>
              <span className="text-sm text-ink-500">{form.importance}%</span>
            </div>
            <input type="range" min={0} max={100} value={form.importance} onChange={(e) => updateForm({ importance: +e.target.value })} className="w-full accent-[#7c3aed]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="lf-btn-secondary" onClick={() => setModalOpen(false)}>取消</button>
            <button type="button" className="lf-btn-primary" disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
              {submitting ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
