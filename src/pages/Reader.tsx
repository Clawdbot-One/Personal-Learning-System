// 海绵阅读法 — 三层笔记法 · 从碎片到体系
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BookOpen, Plus, X, Loader2, AlertCircle, Sparkles, ChevronDown,
  Quote, Layers, BookMarked, Calendar, TrendingUp,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip,
} from "recharts";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, EmptyState, SectionTitle } from "@/components/ui";
import { learningApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { ReadingNote } from "@/types";

const LAYERS = [
  {
    key: "fragments", name: "碎片层", en: "Fragments",
    desc: "第一遍：灵感金句与关键概念", icon: Quote,
    color: "text-gold-600 bg-gold-50", badge: "gold" as const,
  },
  {
    key: "chapter", name: "章节层", en: "Chapter",
    desc: "第二遍：章节结构与逻辑脉络", icon: Layers,
    color: "text-brand-600 bg-brand-50", badge: "brand" as const,
  },
  {
    key: "book", name: "全书层", en: "Book",
    desc: "第三遍：核心观点与知识体系", icon: BookMarked,
    color: "text-green-600 bg-green-50", badge: "success" as const,
  },
];

const LAYER_META: Record<string, { name: string; variant: "gold" | "brand" | "success" }> = {
  fragments: { name: "碎片层", variant: "gold" },
  chapter: { name: "章节层", variant: "brand" },
  book: { name: "全书层", variant: "success" },
};

type AbilitiesResp = {
  abilities?: { ability: string; score: number }[];
  stage?: { stage?: string; description?: string; avg_score?: number; strategy?: string; weakest_ability?: string };
};

export default function Reader() {
  const [notes, setNotes] = useState<ReadingNote[]>([]);
  const [abilities, setAbilities] = useState<AbilitiesResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = () => {
    setLoading(true);
    Promise.all([
      learningApi.listNotes().catch(() => [] as ReadingNote[]),
      learningApi.readingAbilities().catch(() => null),
    ]).then(([n, a]) => {
      setNotes(n);
      setAbilities(a);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // 按书分组
  const grouped = useMemo(() => {
    const m = new Map<string, ReadingNote[]>();
    for (const note of notes) {
      const key = note.book_title || "未命名书目";
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(note);
    }
    return Array.from(m.entries());
  }, [notes]);

  const radarData = (abilities?.abilities ?? []).map((a) => ({ subject: a.ability, score: a.score }));

  return (
    <Layout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 animate-slide-up">
        <div>
          <h1 className="lf-page-title flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-gold-500" /> 海绵阅读法
          </h1>
          <p className="lf-page-subtitle">三层笔记法 · 从碎片到体系</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="lf-btn-gold">
          <Plus className="w-4 h-4" /> 新建笔记
        </button>
      </div>

      {/* 三层笔记说明 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {LAYERS.map((l) => {
          const Icon = l.icon;
          return (
            <Card key={l.key} hover className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", l.color)}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-display font-bold text-ink-900 text-sm">{l.name}</div>
                  <div className="text-[10px] text-ink-400 font-mono tracking-wide">{l.en.toUpperCase()}</div>
                </div>
              </div>
              <p className="text-xs text-ink-500 leading-relaxed">{l.desc}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 笔记列表 */}
        <div className="lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="我的笔记" subtitle={`${notes.length} 条笔记 · ${grouped.length} 本书`}
              action={<button onClick={() => setModalOpen(true)} className="lf-btn-ghost text-xs px-2.5 py-1.5"><Plus className="w-3.5 h-3.5" /> 添加</button>} />
            {loading ? (
              <Loading text="正在加载笔记..." />
            ) : notes.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-12 h-12" />} title="还没有阅读笔记"
                description="从第一遍阅读的碎片笔记开始，逐步构建你的三层笔记体系。"
                action={<button onClick={() => setModalOpen(true)} className="lf-btn-gold"><Plus className="w-4 h-4" /> 创建第一条笔记</button>} />
            ) : (
              <div className="space-y-3">
                {grouped.map(([title, items]) => (
                  <BookSection key={title} title={title} notes={items} />
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* 阅读能力雷达 */}
        <div className="space-y-6">
          <Card className="p-5">
            <SectionTitle title="阅读能力" subtitle="七大能力维度评估" />
            {loading ? (
              <Loading text="加载能力数据..." />
            ) : radarData.length === 0 ? (
              <EmptyState icon={<TrendingUp className="w-8 h-8" />} title="暂无能力数据" description="记录笔记后将自动评估" />
            ) : (
              <>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} outerRadius="72%">
                      <PolarGrid stroke="#e2e5ea" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#6b7280" }} />
                      <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                      <Radar dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} strokeWidth={2} />
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e5ea", fontSize: 13 }}
                        formatter={(v: number) => [`${v} 分`, "能力值"]} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                {abilities?.stage && (
                  <div className="mt-3 p-3 rounded-lg bg-gold-50 border border-gold-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="w-4 h-4 text-gold-600" />
                      <span className="text-sm font-semibold text-gold-800">{abilities.stage.stage}</span>
                      <span className="text-xs font-mono text-gold-600 ml-auto">
                        均分 {abilities.stage.avg_score?.toFixed(1) ?? "—"}
                      </span>
                    </div>
                    <p className="text-xs text-gold-700 leading-relaxed">{abilities.stage.strategy}</p>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>

      {modalOpen && (
        <NoteModal onClose={() => setModalOpen(false)} onCreated={() => { setModalOpen(false); fetchAll(); }} />
      )}
    </Layout>
  );
}

function BookSection({ title, notes }: { title: string; notes: ReadingNote[] }) {
  const [open, setOpen] = useState(true);
  const counts = notes.reduce((acc, n) => { acc[n.layer] = (acc[n.layer] || 0) + 1; return acc; }, {} as Record<string, number>);
  return (
    <div className="rounded-lg border border-ink-200 overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-2 p-3 bg-ink-50 hover:bg-ink-100 transition-colors text-left">
        <BookMarked className="w-4 h-4 text-gold-500 shrink-0" />
        <span className="font-display font-semibold text-ink-900 text-sm flex-1 truncate">{title}</span>
        <span className="text-xs text-ink-400">{notes.length} 条</span>
        {(["fragments", "chapter", "book"] as const).map((l) => counts[l] ? (
          <Badge key={l} variant={LAYER_META[l].variant}>{LAYER_META[l].name} {counts[l]}</Badge>
        ) : null)}
        <ChevronDown className={cn("w-4 h-4 text-ink-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="p-3 space-y-2 animate-fade-in">
          {notes.map((n) => {
            const meta = LAYER_META[n.layer] ?? { name: n.layer, variant: "default" as const };
            return (
              <div key={n.id} className="p-3 rounded-lg border border-ink-100 hover:border-ink-200 transition-colors">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant={meta.variant}>{meta.name}</Badge>
                  {n.author && <span className="text-xs text-ink-400">{n.author}</span>}
                  {n.chapter_info && <span className="text-xs text-ink-500 truncate">· {n.chapter_info}</span>}
                  <span className="text-xs text-ink-400 ml-auto flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(n.created_at).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-line">{n.content}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NoteModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [layer, setLayer] = useState("fragments");
  const [chapterInfo, setChapterInfo] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!bookTitle.trim()) { setError("请填写书名"); return; }
    if (!content.trim()) { setError("请填写笔记内容"); return; }
    setSubmitting(true);
    try {
      await learningApi.createNote({ book_title: bookTitle.trim(), author: author.trim(), layer, content: content.trim(), chapter_info: chapterInfo.trim() });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建失败，请重试");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-900/50 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-cardhover animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold-50 flex items-center justify-center"><BookOpen className="w-4 h-4 text-gold-600" /></div>
            <h3 className="font-display font-bold text-ink-900">新建阅读笔记</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ink-100 text-ink-400 hover:text-ink-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">书名 <span className="text-red-500">*</span></label>
              <input type="text" value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} className="lf-input" placeholder="例如：海绵阅读法" autoFocus />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 mb-1.5">作者</label>
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="lf-input" placeholder="作者姓名" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-2">笔记层级</label>
            <div className="grid grid-cols-3 gap-2">
              {LAYERS.map((l) => {
                const Icon = l.icon;
                const sel = layer === l.key;
                return (
                  <button key={l.key} type="button" onClick={() => setLayer(l.key)}
                    className={cn("flex flex-col items-center gap-1 p-2.5 rounded-lg border text-xs font-medium transition-all",
                      sel ? "border-gold-400 bg-gold-50 text-gold-700 shadow-sm" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
                    <Icon className="w-4 h-4" />{l.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">章节信息</label>
            <input type="text" value={chapterInfo} onChange={(e) => setChapterInfo(e.target.value)} className="lf-input" placeholder="例如：第三章 · 三层笔记法" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-700 mb-1.5">笔记内容 <span className="text-red-500">*</span></label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} className="lf-input min-h-[120px] resize-y" placeholder="记录金句、观点或个人洞察..." />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink-100">
            <button type="button" onClick={onClose} className="lf-btn-secondary">取消</button>
            <button type="submit" disabled={submitting} className="lf-btn-gold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {submitting ? "保存中..." : "保存笔记"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
