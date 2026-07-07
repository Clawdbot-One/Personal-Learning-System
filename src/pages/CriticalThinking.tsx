// 批判性思维 — 学会提问 · 识别谬误 · 评估证据
import { useEffect, useState } from "react";
import {
  Brain, Sparkles, Loader2, AlertTriangle, ShieldCheck, ListOrdered,
  HelpCircle, Search, Droplets, Filter, ChevronRight,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, EmptyState, SectionTitle } from "@/components/ui";
import { learningApi } from "@/api/client";
import { cn } from "@/lib/utils";

// 静态兜底：11 步批判性思维清单
const STATIC_STEPS = [
  { step: 1, name: "论题是什么", desc: "明确讨论的主题与范围" },
  { step: 2, name: "结论是什么", desc: "找出作者想要你接受的核心主张" },
  { step: 3, name: "理由是什么", desc: "梳理支撑结论的理由与论据" },
  { step: 4, name: "哪些词句有歧义", desc: "识别含义模糊或多义的关键词" },
  { step: 5, name: "什么是价值观假设", desc: "揭示作者未明说的价值取向" },
  { step: 6, name: "什么是描述性假设", desc: "识别关于世界运行的隐含前提" },
  { step: 7, name: "推理有没有谬误", desc: "检查推理过程中的逻辑谬误" },
  { step: 8, name: "证据的效力如何", desc: "评估证据的可信度与强度" },
  { step: 9, name: "有没有替代原因", desc: "寻找其他可能的原因解释" },
  { step: 10, name: "数据有没有欺骗性", desc: "核实数据来源与统计方法" },
  { step: 11, name: "有什么重要信息被省略", desc: "关注被选择性忽略的反面信息" },
];

// 静态兜底：8 类常见逻辑谬误
const STATIC_FALLACIES = [
  { name: "人身攻击", desc: "攻击提出观点的人，而非观点本身" },
  { name: "稻草人谬误", desc: "歪曲对方观点后攻击歪曲后的版本" },
  { name: "滑坡谬误", desc: "假设一事导致系列灾难后果，缺乏证据" },
  { name: "诉诸权威", desc: "仅因权威人士说了就认为是正确的" },
  { name: "诉诸情感", desc: "用情感煽动代替理性论证" },
  { name: "循环论证", desc: "用结论本身作为理由来证明结论" },
  { name: "虚假两难", desc: "只给出两个极端选择，忽略其他可能" },
  { name: "以偏概全", desc: "用局部案例推出普遍性结论" },
];

const STATIC_QUESTIONS = [
  { q: "论题和结论是什么？", purpose: "明确讨论对象" },
  { q: "理由是什么？", purpose: "找出支撑结论的依据" },
  { q: "哪些词句有歧义？", purpose: "澄清关键概念" },
  { q: "推理中是否存在谬误？", purpose: "检验逻辑有效性" },
  { q: "证据的可信度有多高？", purpose: "评估论据质量" },
  { q: "是否存在替代原因？", purpose: "排除他因" },
  { q: "有哪些重要信息被省略？", purpose: "补充完整图景" },
];

const MODES = [
  { key: "sponging", name: "海绵式", desc: "被动接收，获取尽可能多的知识", icon: Droplets },
  { key: "panning", name: "淘金式", desc: "主动提问批判，筛选信息可靠性", icon: Filter },
];

type Step = { step?: number; name?: string; desc?: string; question?: string; finding?: string };
type Fallacy = { name: string; desc?: string; example?: string; suggestion?: string };
type Analysis = {
  mode?: string; mode_desc?: string;
  steps?: Step[];
  fallacies?: Fallacy[];
  evidence?: { overall_level?: number; level_name?: string; reliability?: string; improvement?: string };
  overall_assessment?: string;
};

export default function CriticalThinking() {
  const [text, setText] = useState("");
  const [mode, setMode] = useState("panning");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [error, setError] = useState("");

  const [steps, setSteps] = useState<Step[]>(STATIC_STEPS);
  const [fallacies, setFallacies] = useState<Fallacy[]>(STATIC_FALLACIES);
  const [questions, setQuestions] = useState<{ q: string; purpose: string }[]>(STATIC_QUESTIONS);

  useEffect(() => {
    learningApi.criticalSteps().then((r) => {
      const s = (r.steps as Step[] | undefined);
      if (s && s.length) setSteps(s);
    }).catch(() => {});
    learningApi.fallacies().then((r) => {
      const f = (r.fallacies as Fallacy[] | undefined);
      if (f && f.length) setFallacies(f);
    }).catch(() => {});
    learningApi.criticalQuestions().then((r) => {
      const q = (r.questions as { q: string; purpose: string }[] | undefined);
      if (q && q.length) setQuestions(q);
    }).catch(() => {});
  }, []);

  const analyze = async () => {
    setError("");
    if (!text.trim()) { setError("请粘贴需要分析的论证或文章"); return; }
    setAnalyzing(true);
    setAnalysis(null);
    try {
      const res = await learningApi.criticalAnalyze({ text: text.trim(), mode });
      setAnalysis(res as Analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "分析失败，请重试");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 animate-slide-up">
        <h1 className="lf-page-title flex items-center gap-2">
          <Brain className="w-7 h-7 text-red-500" /> 批判性思维
        </h1>
        <p className="lf-page-subtitle">学会提问 · 识别谬误 · 评估证据</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 左：11 步清单 */}
        <div className="lg:col-span-1">
          <Card className="p-5 lg:sticky lg:top-6">
            <SectionTitle title="11 步分析清单" subtitle="系统化批判性思考" />
            <div className="space-y-1.5">
              {steps.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-red-50/60 transition-colors">
                  <span className="w-6 h-6 rounded-md bg-red-100 text-red-600 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                    {s.step ?? i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-ink-800 leading-snug">{s.name}</div>
                    {s.desc && <div className="text-xs text-ink-400 mt-0.5 leading-relaxed">{s.desc}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* 中：分析输入与结果 */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-5">
            <SectionTitle title="论证分析" subtitle="粘贴文章或论证，AI 辅助批判性拆解" />
            {/* 模式选择 */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              {MODES.map((m) => {
                const Icon = m.icon;
                const sel = mode === m.key;
                return (
                  <button key={m.key} type="button" onClick={() => setMode(m.key)}
                    className={cn("flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all",
                      sel ? "border-red-400 bg-red-50 shadow-sm" : "border-ink-200 hover:bg-ink-50")}>
                    <Icon className={cn("w-4 h-4 shrink-0", sel ? "text-red-600" : "text-ink-400")} />
                    <div className="min-w-0">
                      <div className={cn("text-sm font-semibold", sel ? "text-red-700" : "text-ink-800")}>{m.name}</div>
                      <div className="text-xs text-ink-500 truncate">{m.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
            {/* 文本输入 */}
            <textarea value={text} onChange={(e) => setText(e.target.value)}
              className="lf-input min-h-[160px] resize-y font-sans" placeholder={"粘贴你想分析的论证、广告、文章或观点……\n\n例如：某院士说这个学习方法有效，所以一定是有效的。大家都这么学，因此一定是对的。"}
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                <AlertTriangle className="w-4 h-4 shrink-0" /><span>{error}</span>
              </div>
            )}
            <button onClick={analyze} disabled={analyzing} className="lf-btn-primary w-full mt-3 bg-red-600 hover:bg-red-700">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              {analyzing ? "分析中..." : "开始分析"}
            </button>
          </Card>

          {/* 分析结果 */}
          {analyzing && !analysis && (
            <Card className="p-5"><Loading text="正在进行批判性分析..." /></Card>
          )}
          {analysis && <AnalysisResult analysis={analysis} />}
        </div>

        {/* 右：谬误参考 + 关键问题 */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <SectionTitle title="常见谬误" subtitle="8 类逻辑谬误参考" />
            <div className="space-y-2">
              {fallacies.map((f, i) => (
                <div key={i} className="p-2.5 rounded-lg border border-ink-100 hover:border-red-200 transition-colors">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span className="text-sm font-semibold text-ink-800">{f.name}</span>
                  </div>
                  <p className="text-xs text-ink-500 leading-relaxed pl-5">{f.desc}</p>
                  {f.example && <p className="text-xs text-ink-400 italic mt-1 pl-5">例：{f.example}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="关键提问" subtitle="淘金式思维清单" />
            <div className="space-y-2">
              {questions.map((q, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg hover:bg-ink-50 transition-colors">
                  <HelpCircle className="w-3.5 h-3.5 text-brand-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <div className="text-sm text-ink-800 leading-snug">{q.q}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{q.purpose}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function AnalysisResult({ analysis }: { analysis: Analysis }) {
  const detected = analysis.fallacies ?? [];
  const evidence = analysis.evidence;
  return (
    <Card className="p-5 animate-scale-in">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-red-500" />
        <h3 className="font-display font-bold text-ink-900 text-lg">分析结果</h3>
        {analysis.mode && <Badge variant="brand">{analysis.mode === "sponging" ? "海绵式" : "淘金式"}</Badge>}
      </div>

      {/* 模式说明 */}
      {analysis.mode_desc && (
        <div className="p-3 rounded-lg bg-ink-50 text-xs text-ink-600 mb-4 leading-relaxed">{analysis.mode_desc}</div>
      )}

      {/* 综合评估 */}
      {analysis.overall_assessment && (
        <div className={cn("p-3 rounded-lg border mb-4 flex items-start gap-2",
          detected.length > 1 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200")}>
          <ShieldCheck className={cn("w-5 h-5 shrink-0 mt-0.5", detected.length > 1 ? "text-red-600" : "text-green-600")} />
          <div>
            <div className={cn("text-xs font-semibold mb-1", detected.length > 1 ? "text-red-700" : "text-green-700")}>综合评估</div>
            <p className={cn("text-sm leading-relaxed", detected.length > 1 ? "text-red-800" : "text-green-800")}>{analysis.overall_assessment}</p>
          </div>
        </div>
      )}

      {/* 检测到的谬误 */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <ListOrdered className="w-4 h-4 text-red-500" />
          <span className="text-sm font-semibold text-ink-800">检测到的谬误</span>
          <Badge variant={detected.length ? "danger" : "success"}>{detected.length} 处</Badge>
        </div>
        {detected.length === 0 ? (
          <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" /> 未检测到明显逻辑谬误
          </div>
        ) : (
          <div className="space-y-2">
            {detected.map((f, i) => (
              <div key={i} className="p-3 rounded-lg bg-red-50 border border-red-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Badge variant="danger"><AlertTriangle className="w-3 h-3" /> {f.name}</Badge>
                </div>
                {f.desc && <p className="text-xs text-red-700 leading-relaxed">{f.desc}</p>}
                {f.suggestion && <p className="text-xs text-ink-500 mt-1 leading-relaxed">💡 {f.suggestion}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 证据评估 */}
      {evidence && (
        <div className="mb-4 p-3 rounded-lg bg-brand-50 border border-brand-200">
          <div className="flex items-center gap-1.5 mb-2">
            <ShieldCheck className="w-4 h-4 text-brand-600" />
            <span className="text-sm font-semibold text-brand-800">证据评估</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-brand-600">证据强度</div>
              <div className="font-bold text-brand-800">
                {evidence.level_name ?? (evidence.overall_level ? `L${evidence.overall_level}` : "—")}
              </div>
            </div>
            <div>
              <div className="text-xs text-brand-600">可靠性</div>
              <div className="text-brand-800 text-xs leading-relaxed">{evidence.reliability ?? "—"}</div>
            </div>
          </div>
          {evidence.improvement && (
            <p className="text-xs text-ink-500 mt-2 leading-relaxed">💡 {evidence.improvement}</p>
          )}
        </div>
      )}

      {/* 逐步分析 */}
      {analysis.steps && analysis.steps.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer text-sm font-semibold text-ink-700 hover:text-ink-900 list-none">
            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
            逐步分析（{analysis.steps.length} 步）
          </summary>
          <div className="mt-2 space-y-1.5 pl-5">
            {analysis.steps.map((s, i) => (
              <div key={i} className="text-sm">
                <div className="font-medium text-ink-800">
                  <span className="text-ink-400 font-mono mr-1">{s.step ?? i + 1}.</span>{s.name}
                </div>
                {s.finding && <div className="text-xs text-ink-500 leading-relaxed mt-0.5 pl-5">{s.finding}</div>}
              </div>
            ))}
          </div>
        </details>
      )}
    </Card>
  );
}
