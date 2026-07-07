/**
 * 阅读工作台 —— 海绵阅读法 · 三层笔记 · 知识内化
 * 纯前端实现，笔记存于 localStorage（key: learnflow_notes）
 */
import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Trash2, Layers, FileText, Lightbulb, Tag, Radar as RadarIcon } from 'lucide-react'
import { PageHeader, Card, EmptyState } from '@/components/ui'

type Level = 'L1' | 'L2' | 'L3'
interface Note {
  id: string
  book: string
  level: Level
  excerpt: string
  insight: string
  tags: string[]
  created_at: string
}

const STORAGE_KEY = 'learnflow_notes'

const LAYER_INFO: { level: Level; title: string; desc: string; color: string; border: string }[] = [
  { level: 'L1', title: 'L1 · 片段摘录', desc: '原文金句、关键数据与概念的原样记录', color: 'text-brand-600', border: 'border-brand-500' },
  { level: 'L2', title: 'L2 · 章节归纳', desc: '用自己的话概括章节核心论点与结构', color: 'text-purple-600', border: 'border-purple-500' },
  { level: 'L3', title: 'L3 · 全书重构', desc: '跨章节整合，形成自己的知识体系', color: 'text-gold-600', border: 'border-gold-500' },
]

const RADAR_DIMS = ['选书', '速读', '精读', '记忆', '输出']
const RADAR_SIZE = 260
const CX = RADAR_SIZE / 2
const CY = RADAR_SIZE / 2
const R = 92

const polar = (i: number, r: number): [number, number] => {
  const ang = (-90 + i * (360 / RADAR_DIMS.length)) * (Math.PI / 180)
  return [CX + r * Math.cos(ang), CY + r * Math.sin(ang)]
}

function loadNotes(): Note[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export default function Reader() {
  const [notes, setNotes] = useState<Note[]>(loadNotes)
  const [book, setBook] = useState('')
  const [level, setLevel] = useState<Level>('L1')
  const [excerpt, setExcerpt] = useState('')
  const [insight, setInsight] = useState('')
  const [tags, setTags] = useState('')
  const [radar, setRadar] = useState<Record<string, number>>({
    选书: 60, 速读: 55, 精读: 65, 记忆: 50, 输出: 45,
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  }, [notes])

  const grouped = useMemo(() => {
    const g: Record<Level, Note[]> = { L1: [], L2: [], L3: [] }
    notes.forEach((n) => g[n.level].push(n))
    return g
  }, [notes])

  const addNote = () => {
    if (!book.trim() || !excerpt.trim()) return
    const n: Note = {
      id: `n-${Date.now()}`,
      book: book.trim(),
      level,
      excerpt: excerpt.trim(),
      insight: insight.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
    }
    setNotes((prev) => [n, ...prev])
    setBook(''); setExcerpt(''); setInsight(''); setTags('')
  }

  const removeNote = (id: string) => setNotes((prev) => prev.filter((n) => n.id !== id))

  // 雷达图点位
  const valPts = RADAR_DIMS.map((d, i) => polar(i, (R * radar[d]) / 100).join(',')).join(' ')

  return (
    <div className="animate-fade-in">
      <PageHeader title="阅读工作台" subtitle="海绵阅读法 · 三层笔记 · 知识内化" />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 左：笔记表单 + 雷达图 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 三层笔记说明 */}
          <div className="grid grid-cols-1 gap-2">
            {LAYER_INFO.map((l) => (
              <div key={l.level} className={`lf-card p-3 border-l-4 ${l.border}`}>
                <div className={`text-sm font-semibold ${l.color}`}>{l.title}</div>
                <p className="text-xs text-ink-500 mt-0.5">{l.desc}</p>
              </div>
            ))}
          </div>

          {/* 笔记记录表单 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Plus size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">记录笔记</h3>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">书名</label>
                <input className="lf-input !py-2" placeholder="如：海绵阅读法" value={book} onChange={(e) => setBook(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">笔记层级</label>
                <div className="grid grid-cols-3 gap-2">
                  {LAYER_INFO.map((l) => (
                    <button
                      key={l.level}
                      onClick={() => setLevel(l.level)}
                      className={`px-2 py-1.5 rounded-lg text-sm font-medium border transition-all ${level === l.level ? `${l.border} bg-ink-50 text-ink-900` : 'border-ink-200 text-ink-500 hover:bg-ink-50'}`}
                    >
                      {l.level}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">片段内容</label>
                <textarea className="lf-input !py-2 resize-none" rows={3} placeholder="摘录原文或章节要点" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">我的洞察</label>
                <textarea className="lf-input !py-2 resize-none" rows={2} placeholder="联想、反思与疑问" value={insight} onChange={(e) => setInsight(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">标签（逗号分隔）</label>
                <input className="lf-input !py-2" placeholder="阅读, 方法论" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>
              <button onClick={addNote} disabled={!book.trim() || !excerpt.trim()} className="lf-btn-primary w-full !py-2">
                <Plus size={16} /> 保存笔记
              </button>
            </div>
          </Card>

          {/* 阅读能力雷达图 */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <RadarIcon size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">阅读能力自评</h3>
            </div>
            <div className="flex justify-center mb-3">
              <svg width={RADAR_SIZE} height={RADAR_SIZE} className="max-w-full">
                {/* 背景网格 */}
                {[0.25, 0.5, 0.75, 1].map((s) => (
                  <polygon key={s} points={RADAR_DIMS.map((_, i) => polar(i, R * s).join(',')).join(' ')} fill="none" stroke="#e2e5ea" strokeWidth={1} />
                ))}
                {/* 轴线 */}
                {RADAR_DIMS.map((_, i) => {
                  const [x, y] = polar(i, R)
                  return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="#e2e5ea" strokeWidth={1} />
                })}
                {/* 数据多边形 */}
                <polygon points={valPts} fill="rgba(37,99,235,0.18)" stroke="#2563eb" strokeWidth={2} />
                {RADAR_DIMS.map((d, i) => {
                  const [x, y] = polar(i, (R * radar[d]) / 100)
                  return <circle key={d} cx={x} cy={y} r={3} fill="#2563eb" />
                })}
                {/* 维度标签 */}
                {RADAR_DIMS.map((d, i) => {
                  const [x, y] = polar(i, R + 18)
                  return <text key={d} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="text-xs fill-ink-600" style={{ fontSize: 12 }}>{d}</text>
                })}
              </svg>
            </div>
            <div className="space-y-2">
              {RADAR_DIMS.map((d) => (
                <div key={d} className="flex items-center gap-3">
                  <span className="text-xs text-ink-600 w-10 shrink-0">{d}</span>
                  <input
                    type="range" min={0} max={100} value={radar[d]}
                    onChange={(e) => setRadar((r) => ({ ...r, [d]: Number(e.target.value) }))}
                    className="flex-1 accent-brand-600"
                  />
                  <span className="text-xs font-semibold text-ink-800 w-8 text-right tabular-nums">{radar[d]}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 右：笔记列表 */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Layers size={18} className="text-brand-600" />
              <h3 className="font-semibold text-ink-900">我的笔记</h3>
              <span className="lf-badge bg-ink-100 text-ink-500 ml-auto">{notes.length} 条</span>
            </div>

            {notes.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="还没有笔记"
                description="使用海绵阅读法的三层笔记结构，把读过的书真正内化为知识。先在左侧记录第一条吧。"
              />
            ) : (
              <div className="space-y-6">
                {LAYER_INFO.map((l) => {
                  const list = grouped[l.level]
                  if (list.length === 0) return null
                  return (
                    <div key={l.level}>
                      <div className={`flex items-center gap-2 mb-2 ${l.color}`}>
                        <span className="text-sm font-semibold">{l.title}</span>
                        <span className="text-xs text-ink-400">· {list.length} 条</span>
                      </div>
                      <div className="space-y-2">
                        {list.map((n) => (
                          <div key={n.id} className={`rounded-lg border-l-4 ${l.border} bg-white border border-ink-200 p-3.5`}>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                                <BookOpen size={14} className="text-ink-400" /> {n.book}
                              </div>
                              <button onClick={() => removeNote(n.id)} className="lf-btn-ghost !p-1 text-ink-400 hover:text-red-500" title="删除">
                                <Trash2 size={14} />
                              </button>
                            </div>
                            <div className="flex gap-2 text-sm text-ink-700 mb-1.5">
                              <FileText size={14} className="text-ink-400 mt-0.5 shrink-0" />
                              <p className="leading-relaxed">{n.excerpt}</p>
                            </div>
                            {n.insight && (
                              <div className="flex gap-2 text-sm text-ink-600 mb-1.5">
                                <Lightbulb size={14} className="text-gold-500 mt-0.5 shrink-0" />
                                <p className="leading-relaxed italic">{n.insight}</p>
                              </div>
                            )}
                            {n.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {n.tags.map((t) => (
                                  <span key={t} className="lf-badge bg-ink-100 text-ink-500">
                                    <Tag size={10} /> {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
