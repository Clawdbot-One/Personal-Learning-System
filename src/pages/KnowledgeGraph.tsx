// 知识图谱 — 构建你的知识网络
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ReactFlow, Background, Controls, MiniMap, Handle, Position,
  type Node, type Edge, type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Network, Plus, Search, Trash2, Edit3, Link2, X, Loader2, AlertCircle,
  Database, GitBranch, TrendingUp, Layers,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, EmptyState, StatCard } from "@/components/ui";
import { knowledgeApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { KnowledgeNode, KnowledgeEdge } from "@/types";

// 关系类型元数据
const RELATION_META: Record<string, { label: string; color: string }> = {
  prerequisite: { label: "前置", color: "#2563eb" },
  related: { label: "相关", color: "#9aa3b2" },
  extends: { label: "延伸", color: "#10b981" },
  contradicts: { label: "矛盾", color: "#ef4444" },
};

const RELATION_OPTIONS = [
  { value: "prerequisite", label: "前置 (prerequisite)" },
  { value: "related", label: "相关 (related)" },
  { value: "extends", label: "延伸 (extends)" },
  { value: "contradicts", label: "矛盾 (contradicts)" },
];

// 分类配色（基于哈希）
const CATEGORY_COLORS = ["#2563eb", "#f59e0b", "#10b981", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899", "#84cc16"];
function categoryColor(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = cat.charCodeAt(i) + ((hash << 5) - hash);
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length];
}

function fmtDate(s?: string | null): string {
  if (!s) return "—";
  const d = new Date(s);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

// ===== 自定义节点 =====
type KnowledgeData = {
  concept: string;
  category: string;
  mastery_level: number;
};

function KnowledgeNodeCard({ data, selected }: NodeProps) {
  const d = data as unknown as KnowledgeData;
  const color = categoryColor(d.category || "未分类");
  return (
    <div
      className={cn(
        "w-[180px] rounded-xl bg-white border px-3 py-2.5 shadow-card transition-all",
        selected ? "border-brand-500 ring-2 ring-brand-500/30" : "border-ink-200 hover:border-brand-300"
      )}
    >
      <Handle type="target" position={Position.Top} className="!w-2.5 !h-2.5 !bg-brand-400 !border-brand-500" />
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white" style={{ background: color }} />
        <span className="text-sm font-semibold text-ink-900 truncate">{d.concept}</span>
      </div>
      <div className="text-[10px] text-ink-400 mb-1.5 truncate">{d.category || "未分类"}</div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.round(d.mastery_level * 100)}%`, background: color }}
          />
        </div>
        <span className="text-[10px] font-mono text-ink-500">{Math.round(d.mastery_level * 100)}%</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2.5 !h-2.5 !bg-brand-400 !border-brand-500" />
    </div>
  );
}

const nodeTypes = { knowledge: KnowledgeNodeCard };

export default function KnowledgeGraph() {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [edges, setEdges] = useState<KnowledgeEdge[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [selected, setSelected] = useState<KnowledgeNode | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([knowledgeApi.graph(), knowledgeApi.categories().catch(() => [] as string[])])
      .then(([g, cats]) => {
        setNodes(g.nodes);
        setEdges(g.edges);
        setCategories(cats);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 过滤后的可见节点与边
  const visibleNodes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return nodes.filter((n) => {
      if (categoryFilter && n.category !== categoryFilter) return false;
      if (q && !n.concept.toLowerCase().includes(q) && !n.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [nodes, search, categoryFilter]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((n) => n.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => edges.filter((e) => visibleIds.has(e.source_id) && visibleIds.has(e.target_id)),
    [edges, visibleIds]
  );

  // 圆形布局
  const flowNodes: Node[] = useMemo(() => {
    const n = visibleNodes.length;
    const radius = 200;
    const cx = 300;
    const cy = 300;
    return visibleNodes.map((node, i) => {
      const angle = (2 * Math.PI * i) / (n || 1);
      return {
        id: node.id,
        type: "knowledge",
        position: { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) },
        data: {
          concept: node.concept,
          category: node.category,
          mastery_level: node.mastery_level,
        },
      };
    });
  }, [visibleNodes]);

  const flowEdges: Edge[] = useMemo(
    () =>
      visibleEdges.map((e) => {
        const meta = RELATION_META[e.relation_type] ?? RELATION_META.related;
        return {
          id: e.id,
          source: e.source_id,
          target: e.target_id,
          label: meta.label,
          type: "smoothstep",
          animated: e.relation_type === "prerequisite",
          style: { stroke: meta.color, strokeWidth: 2 },
          labelStyle: { fontSize: 11, fill: "#374151", fontWeight: 600 },
          labelBgStyle: { fill: "#ffffff" },
          labelBgPadding: [4, 2] as [number, number],
          labelBgBorderRadius: 4,
        };
      }),
    [visibleEdges]
  );

  // 统计
  const stats = useMemo(() => {
    const total = nodes.length;
    const relations = edges.length;
    const avg = total > 0 ? nodes.reduce((s, n) => s + n.mastery_level, 0) / total : 0;
    const cats = new Set(nodes.map((n) => n.category)).size;
    return { total, relations, avg, cats };
  }, [nodes, edges]);

  const handleNodeClick = (_: unknown, node: Node) => {
    const full = nodes.find((n) => n.id === node.id);
    if (full) {
      setSelected(full);
      setEditing(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除该知识节点？相关关系也会一并移除。")) return;
    try {
      await knowledgeApi.deleteNode(id);
      setSelected(null);
      fetchAll();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateMastery = async (id: string, mastery: number) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, mastery_level: mastery } : n)));
    setSelected((prev) => (prev && prev.id === id ? { ...prev, mastery_level: mastery } : prev));
    try {
      await knowledgeApi.updateNode(id, { mastery_level: mastery });
    } catch (e) {
      console.error(e);
      fetchAll();
    }
  };

  return (
    <Layout>
      {/* 页头 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="lf-page-title flex items-center gap-2">
            <Network className="w-7 h-7 text-brand-600" /> 知识图谱
          </h1>
          <p className="lf-page-subtitle">构建你的知识网络 · {stats.total} 个节点 · {stats.relations} 条关系</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="lf-btn-primary">
          <Plus className="w-4 h-4" /> 新建节点
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Database className="w-5 h-5" />} label="知识节点" value={stats.total} hint="NODES" accent="brand" />
        <StatCard icon={<GitBranch className="w-5 h-5" />} label="知识关系" value={stats.relations} hint="EDGES" accent="gold" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="平均掌握度" value={`${Math.round(stats.avg * 100)}%`} hint="AVG" accent="success" />
        <StatCard icon={<Layers className="w-5 h-5" />} label="分类数" value={stats.cats} hint="CATS" accent="brand" />
      </div>

      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="lf-input pl-9"
            placeholder="搜索概念或描述..."
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="lf-input sm:w-48 cursor-pointer"
        >
          <option value="">全部分类</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 主区域：图谱 + 侧栏 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        <Card className="p-0 overflow-hidden">
          {loading ? (
            <Loading text="正在加载知识图谱..." />
          ) : visibleNodes.length === 0 ? (
            <EmptyState
              icon={<Network className="w-12 h-12" />}
              title={nodes.length === 0 ? "还没有知识节点" : "未匹配到节点"}
              description={nodes.length === 0 ? "创建第一个知识节点，开始构建你的知识网络。" : "试试调整搜索关键词或分类筛选。"}
              action={
                nodes.length === 0 ? (
                  <button onClick={() => setCreateOpen(true)} className="lf-btn-primary">
                    <Plus className="w-4 h-4" /> 创建第一个节点
                  </button>
                ) : (
                  <button onClick={() => { setSearch(""); setCategoryFilter(""); }} className="lf-btn-secondary">
                    清除筛选
                  </button>
                )
              }
            />
          ) : (
            <div className="h-[600px] bg-ink-50">
              <ReactFlow
                nodes={flowNodes}
                edges={flowEdges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                proOptions={{ hideAttribution: true }}
              >
                <Background color="#cbd0d9" gap={20} size={1.5} />
                <Controls className="!shadow-card !border-ink-200 !rounded-lg" />
                <MiniMap
                  className="!bg-white !border-ink-200 !rounded-lg"
                  nodeColor={(n) => categoryColor(((n.data as { category?: string })?.category) || "")}
                  maskColor="rgba(248,249,251,0.6)"
                />
              </ReactFlow>
            </div>
          )}
        </Card>

        {/* 侧栏：节点详情 */}
        <div>
          {selected ? (
            <NodeDetailPanel
              key={selected.id}
              node={selected}
              nodes={nodes}
              categories={categories}
              editing={editing}
              onEdit={() => setEditing(true)}
              onCancelEdit={() => setEditing(false)}
              onDelete={handleDelete}
              onMasteryChange={handleUpdateMastery}
              onSaved={() => { setEditing(false); fetchAll(); }}
            />
          ) : (
            <Card className="p-6 text-center text-sm text-ink-400">
              <Network className="w-10 h-10 mx-auto mb-2 text-ink-200" />
              点击图谱中的节点查看详情
            </Card>
          )}
        </div>
      </div>

      {/* 新建节点弹窗 */}
      {createOpen && (
        <NodeFormModal
          categories={categories}
          onClose={() => setCreateOpen(false)}
          onCreated={() => { setCreateOpen(false); fetchAll(); }}
        />
      )}
    </Layout>
  );
}

// ===== 节点详情面板 =====
function NodeDetailPanel({
  node, nodes, categories, editing, onEdit, onCancelEdit, onDelete, onMasteryChange, onSaved,
}: {
  node: KnowledgeNode;
  nodes: KnowledgeNode[];
  categories: string[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onDelete: (id: string) => void;
  onMasteryChange: (id: string, mastery: number) => void;
  onSaved: () => void;
}) {
  const [mastery, setMastery] = useState(node.mastery_level);
  useEffect(() => { setMastery(node.mastery_level); }, [node.id, node.mastery_level]);

  const color = categoryColor(node.category || "未分类");

  // 添加关系
  const [relTarget, setRelTarget] = useState("");
  const [relType, setRelType] = useState("related");
  const [relStrength, setRelStrength] = useState(0.8);
  const [relSubmitting, setRelSubmitting] = useState(false);
  const [relError, setRelError] = useState("");

  const handleAddRelation = async (e: FormEvent) => {
    e.preventDefault();
    setRelError("");
    if (!relTarget) { setRelError("请选择目标节点"); return; }
    setRelSubmitting(true);
    try {
      await knowledgeApi.createRelation({
        source_id: node.id,
        target_id: relTarget,
        relation_type: relType,
        strength: relStrength,
      });
      setRelTarget("");
      setRelType("related");
      setRelStrength(0.8);
      onSaved();
    } catch (err) {
      setRelError(err instanceof Error ? err.message : "添加失败");
    } finally {
      setRelSubmitting(false);
    }
  };

  if (editing) {
    return (
      <NodeEditForm
        node={node}
        categories={categories}
        onCancel={onCancelEdit}
        onSaved={onSaved}
      />
    );
  }

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-3 h-3 rounded-full shrink-0" style={{ background: color }} />
          <h3 className="font-display font-bold text-ink-900 truncate">{node.concept}</h3>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={onEdit} className="p-1.5 rounded-lg text-ink-400 hover:bg-brand-50 hover:text-brand-600" title="编辑">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(node.id)} className="p-1.5 rounded-lg text-ink-400 hover:bg-red-50 hover:text-red-600" title="删除">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="text-sm text-ink-600 mb-4 leading-relaxed">{node.description || "暂无描述"}</p>

      <div className="space-y-2.5 mb-4 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-ink-400">分类</span>
          <Badge variant="default">{node.category || "未分类"}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">来源</span>
          <span className="text-ink-700 text-right truncate max-w-[180px]">{node.source || "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-ink-400">创建于</span>
          <span className="text-ink-700 font-mono text-xs">{fmtDate(node.created_at)}</span>
        </div>
      </div>

      {/* 掌握度滑块 */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-ink-500 mb-1.5">
          <span>掌握度</span>
          <span className="font-mono text-ink-700 font-semibold">{Math.round(mastery * 100)}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={mastery}
          onChange={(e) => setMastery(Number(e.target.value))}
          onPointerUp={() => onMasteryChange(node.id, mastery)}
          onKeyUp={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") onMasteryChange(node.id, mastery);
          }}
          className="w-full accent-brand-600 cursor-pointer"
        />
      </div>

      {/* 添加关系 */}
      <div className="border-t border-ink-100 pt-4">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-ink-700 mb-2.5">
          <Link2 className="w-4 h-4 text-brand-600" /> 添加关系
        </div>
        <form onSubmit={handleAddRelation} className="space-y-2.5">
          <select value={relTarget} onChange={(e) => setRelTarget(e.target.value)} className="lf-input text-sm">
            <option value="">选择目标节点...</option>
            {nodes.filter((n) => n.id !== node.id).map((n) => (
              <option key={n.id} value={n.id}>{n.concept}</option>
            ))}
          </select>
          <select value={relType} onChange={(e) => setRelType(e.target.value)} className="lf-input text-sm">
            {RELATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <div>
            <div className="flex items-center justify-between text-xs text-ink-500 mb-1">
              <span>关系强度</span>
              <span className="font-mono">{Math.round(relStrength * 100)}%</span>
            </div>
            <input
              type="range" min={0} max={1} step={0.05} value={relStrength}
              onChange={(e) => setRelStrength(Number(e.target.value))}
              className="w-full accent-brand-600 cursor-pointer"
            />
          </div>
          {relError && <p className="text-xs text-red-600 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{relError}</p>}
          <button type="submit" disabled={relSubmitting} className="lf-btn-secondary w-full text-sm">
            {relSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
            {relSubmitting ? "添加中..." : "添加关系"}
          </button>
        </form>
      </div>
    </Card>
  );
}

// ===== 编辑表单 =====
function NodeEditForm({
  node, categories, onCancel, onSaved,
}: {
  node: KnowledgeNode;
  categories: string[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [concept, setConcept] = useState(node.concept);
  const [description, setDescription] = useState(node.description);
  const [category, setCategory] = useState(node.category);
  const [source, setSource] = useState(node.source);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!concept.trim()) { setError("请填写概念名称"); return; }
    setSubmitting(true);
    try {
      await knowledgeApi.updateNode(node.id, {
        concept: concept.trim(),
        description: description.trim(),
        category: category.trim(),
        source: source.trim(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Edit3 className="w-4 h-4 text-brand-600" />
        <h3 className="font-display font-bold text-ink-900">编辑节点</h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">概念名称 <span className="text-red-500">*</span></label>
          <input value={concept} onChange={(e) => setConcept(e.target.value)} className="lf-input text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">描述</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="lf-input text-sm min-h-[60px] resize-y" />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">分类</label>
          <input list="kg-edit-cats" value={category} onChange={(e) => setCategory(e.target.value)} className="lf-input text-sm" placeholder="输入或选择分类" />
          <datalist id="kg-edit-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">来源</label>
          <input value={source} onChange={(e) => setSource(e.target.value)} className="lf-input text-sm" placeholder="书籍、文档等" />
        </div>
        <div className="flex items-center gap-2 pt-1">
          <button type="button" onClick={onCancel} className="lf-btn-secondary flex-1 text-sm">取消</button>
          <button type="submit" disabled={submitting} className="lf-btn-primary flex-1 text-sm">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {submitting ? "保存中..." : "保存"}
          </button>
        </div>
      </form>
    </Card>
  );
}

// ===== 新建节点弹窗 =====
function NodeFormModal({
  categories, onClose, onCreated,
}: {
  categories: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [concept, setConcept] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [mastery, setMastery] = useState(0.5);
  const [source, setSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!concept.trim()) { setError("请填写概念名称"); return; }
    setSubmitting(true);
    try {
      await knowledgeApi.createNode({
        concept: concept.trim(),
        description: description.trim(),
        category: category.trim() || "未分类",
        mastery_level: mastery,
        source: source.trim(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-cardhover animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
              <Network className="w-4 h-4 text-brand-600" />
            </div>
            <h3 className="font-display font-bold text-ink-900">新建知识节点</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">概念名称 <span className="text-red-500">*</span></label>
            <input value={concept} onChange={(e) => setConcept(e.target.value)} className="lf-input" placeholder="例如：刻意练习" autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">描述</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="lf-input min-h-[72px] resize-y" placeholder="解释这个概念的含义..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">分类</label>
              <input list="kg-create-cats" value={category} onChange={(e) => setCategory(e.target.value)} className="lf-input" placeholder="输入或选择" />
              <datalist id="kg-create-cats">{categories.map((c) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">来源</label>
              <input value={source} onChange={(e) => setSource(e.target.value)} className="lf-input" placeholder="书籍 / 文档" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between text-sm text-ink-700 mb-1.5">
              <label className="font-medium">掌握度</label>
              <span className="font-mono text-brand-600 font-semibold">{Math.round(mastery * 100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={mastery} onChange={(e) => setMastery(Number(e.target.value))} className="w-full accent-brand-600 cursor-pointer" />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="lf-btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="lf-btn-primary">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? "创建中..." : "创建节点"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
