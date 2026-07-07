// 刻意练习 — 自适应难度 + 即时反馈 + 舒适区边缘训练
import { useEffect, useState } from "react";
import {
  Zap, Play, RotateCcw, CheckCircle2, XCircle, ArrowRight, ArrowLeft,
  TrendingUp, TrendingDown, Sparkles, Target, ChevronRight, Loader2,
} from "lucide-react";
import Layout from "@/components/Layout";
import { Loading, Card, Badge, ProgressBar, EmptyState, SectionTitle } from "@/components/ui";
import { learningApi } from "@/api/client";
import { cn } from "@/lib/utils";
import type { PracticeQuestion } from "@/types";

const DOMAINS = [
  { value: "general", label: "通用学习", desc: "学习方法与认知科学" },
  { value: "python", label: "Python", desc: "语法与编程思维" },
  { value: "data_science", label: "数据科学", desc: "数据分析与机器学习" },
];

const LEVEL_META: Record<string, { label: string; cls: string }> = {
  beginner: { label: "入门", cls: "bg-green-100 text-green-700" },
  intermediate: { label: "进阶", cls: "bg-brand-100 text-brand-700" },
  advanced: { label: "高级", cls: "bg-gold-100 text-gold-700" },
  expert: { label: "专家", cls: "bg-red-100 text-red-700" },
};

function diffLabel(d: number) {
  if (d < 0.35) return "易";
  if (d < 0.65) return "中";
  return "难";
}
function diffColor(d: number) {
  if (d < 0.35) return "text-green-600";
  if (d < 0.65) return "text-brand-600";
  return "text-red-600";
}

type Zone = { comfort_zone?: number; learning_zone?: number; panic_zone?: number; recommendation?: string };
type Tree = { name?: string; nodes?: { id: string; name: string; level: string; prerequisites?: string[] }[] };

export default function Practice() {
  const [domain, setDomain] = useState("general");
  const [difficulty, setDifficulty] = useState(0.5);
  const [count, setCount] = useState(5);

  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [started, setStarted] = useState(false);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score?: number; adjusted_difficulty?: number; message?: string } | null>(null);

  const [tree, setTree] = useState<Tree | null>(null);
  const [zone, setZone] = useState<Zone | null>(null);

  useEffect(() => {
    learningApi.skillTree(domain).then(setTree).catch(() => setTree(null));
    learningApi.learningZone().then(setZone).catch(() => setZone(null));
  }, [domain]);

  const start = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await learningApi.practice({ domain, difficulty, count });
      setQuestions(res.questions || []);
      setSessionId(res.session_id);
      setAnswers({});
      setCurrentIndex(0);
      setStarted(true);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStarted(false);
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setCurrentIndex(0);
  };

  const selectOption = (qid: string, idx: number) => {
    if (answers[qid] !== undefined) return; // 锁定，答后不可改
    setAnswers((p) => ({ ...p, [qid]: idx }));
  };

  const allAnswered = questions.length > 0 && questions.every((q) => answers[q.id] !== undefined);
  const correctCount = questions.filter((q) => answers[q.id] === q.correct).length;

  const submit = async () => {
    setSubmitting(true);
    try {
      const payload = questions.map((q) => ({
        question_id: q.id,
        answer: answers[q.id],
        correct: answers[q.id] === q.correct,
      }));
      const res = await learningApi.submitPractice({ answers: payload, session_id: sessionId });
      setResult({
        score: res.score ?? correctCount / questions.length,
        adjusted_difficulty: res.adjusted_difficulty,
        message: res.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6 animate-slide-up">
        <h1 className="lf-page-title flex items-center gap-2">
          <Zap className="w-7 h-7 text-brand-600" /> 刻意练习
        </h1>
        <p className="lf-page-subtitle">有目的的、有反馈的、突破舒适区的练习</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {!started ? (
            <Card className="p-6 animate-fade-in">
              <SectionTitle title="练习设置" subtitle="选择领域、难度与题量，进入学习区" />
              <div className="mb-5">
                <label className="block text-sm font-medium text-ink-700 mb-2">练习领域</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {DOMAINS.map((d) => {
                    const sel = domain === d.value;
                    return (
                      <button key={d.value} onClick={() => setDomain(d.value)} type="button"
                        className={cn("p-3 rounded-lg border text-left transition-all",
                          sel ? "border-brand-400 bg-brand-50 shadow-sm" : "border-ink-200 hover:border-ink-300 hover:bg-ink-50")}>
                        <div className={cn("text-sm font-semibold", sel ? "text-brand-700" : "text-ink-800")}>{d.label}</div>
                        <div className="text-xs text-ink-500 mt-0.5">{d.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-ink-700">难度等级</label>
                  <Badge variant="brand">
                    <span className={cn("font-mono font-bold", diffColor(difficulty))}>{diffLabel(difficulty)}</span>
                    <span className="text-ink-400 font-mono ml-1">{difficulty.toFixed(2)}</span>
                  </Badge>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={difficulty}
                  onChange={(e) => setDifficulty(parseFloat(e.target.value))}
                  className="w-full accent-brand-600" />
                <div className="flex justify-between text-xs text-ink-400 mt-1 font-mono">
                  <span>易</span><span>中</span><span>难</span>
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-ink-700 mb-2">题目数量</label>
                <div className="flex gap-2">
                  {[3, 5, 8, 10].map((n) => (
                    <button key={n} onClick={() => setCount(n)} type="button"
                      className={cn("flex-1 py-2 rounded-lg border text-sm font-medium transition-all",
                        count === n ? "border-brand-400 bg-brand-50 text-brand-700" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
                      {n} 题
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={start} disabled={loading} className="lf-btn-primary w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? "加载中..." : "开始练习"}
              </button>
            </Card>
          ) : questions.length === 0 ? (
            <Card className="p-0">
              <EmptyState icon={<Zap className="w-12 h-12" />} title="未生成题目"
                description="该领域暂无题库，请尝试其他领域" action={<button onClick={reset} className="lf-btn-primary">返回设置</button>} />
            </Card>
          ) : (
            <>
              <Card className="p-6 animate-fade-in">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="brand">第 {currentIndex + 1} / {questions.length} 题</Badge>
                    <Badge variant="default">已答 {Object.keys(answers).length} 题</Badge>
                    {result && <Badge variant="success">正确 {correctCount} 题</Badge>}
                  </div>
                  <button onClick={reset} className="lf-btn-ghost text-xs px-2 py-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> 重新开始
                  </button>
                </div>
                <ProgressBar value={Object.keys(answers).length / questions.length} className="mb-5" />

                <QuestionView q={questions[currentIndex]} selected={answers[questions[currentIndex].id]}
                  onSelect={(idx) => selectOption(questions[currentIndex].id, idx)} />

                <div className="flex items-center justify-between mt-5 pt-4 border-t border-ink-100">
                  <button onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="lf-btn-secondary">
                    <ArrowLeft className="w-4 h-4" /> 上一题
                  </button>
                  {currentIndex < questions.length - 1 ? (
                    <button onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))} className="lf-btn-primary">
                      下一题 <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : allAnswered && !result ? (
                    <button onClick={submit} disabled={submitting} className="lf-btn-gold">
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      {submitting ? "提交中..." : "提交并查看成绩"}
                    </button>
                  ) : (
                    <span className="text-xs text-ink-400 flex items-center gap-1">
                      <Target className="w-3.5 h-3.5" /> 完成所有题目后可提交
                    </span>
                  )}
                </div>
              </Card>

              {result && (
                <Card className="p-6 animate-scale-in">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-gold-500" />
                    <h3 className="font-display font-bold text-ink-900 text-lg">练习结果</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 rounded-lg bg-brand-50">
                      <div className="text-xs text-brand-600 mb-1">本次得分</div>
                      <div className="text-3xl font-bold font-display text-brand-700">
                        {result.score !== undefined ? `${Math.round(result.score * 100)}%` : `${correctCount}/${questions.length}`}
                      </div>
                      <div className="text-xs text-ink-500 mt-1">正确 {correctCount} / 共 {questions.length} 题</div>
                    </div>
                    <div className="p-4 rounded-lg bg-gold-50">
                      <div className="text-xs text-gold-600 mb-1">难度已调整</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-2xl font-bold font-display text-ink-500">{difficulty.toFixed(2)}</span>
                        <ArrowRight className="w-4 h-4 text-ink-400" />
                        {result.adjusted_difficulty !== undefined ? (
                          <>
                            <span className={cn("text-2xl font-bold font-display",
                              result.adjusted_difficulty > difficulty ? "text-red-600" : result.adjusted_difficulty < difficulty ? "text-green-600" : "text-ink-700")}>
                              {result.adjusted_difficulty.toFixed(2)}
                            </span>
                            {result.adjusted_difficulty > difficulty ? <TrendingUp className="w-5 h-5 text-red-500" /> :
                              result.adjusted_difficulty < difficulty ? <TrendingDown className="w-5 h-5 text-green-500" /> : null}
                          </>
                        ) : <span className="text-2xl font-bold font-display text-ink-700">—</span>}
                      </div>
                      <div className="text-xs text-ink-500 mt-1">
                        {result.adjusted_difficulty !== undefined && result.adjusted_difficulty > difficulty ? "上调难度，挑战舒适区边缘" :
                         result.adjusted_difficulty !== undefined && result.adjusted_difficulty < difficulty ? "下调难度，回到舒适区边缘" : "保持当前难度节奏"}
                      </div>
                    </div>
                  </div>
                  <button onClick={start} disabled={loading} className="lf-btn-primary w-full">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                    {loading ? "加载中..." : "再来一组"}
                  </button>
                </Card>
              )}
            </>
          )}
        </div>

        <div className="space-y-6">
          <LearningZoneCard zone={zone} current={difficulty} />
          <SkillTreeCard tree={tree} />
        </div>
      </div>
    </Layout>
  );
}

function QuestionView({ q, selected, onSelect }: { q: PracticeQuestion; selected: number | undefined; onSelect: (i: number) => void }) {
  const answered = selected !== undefined;
  const letters = ["A", "B", "C", "D", "E"];
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="gold">难度 {diffLabel(q.difficulty)}</Badge>
        <Badge variant="default">{q.domain}</Badge>
      </div>
      <p className="text-base text-ink-900 font-medium leading-relaxed mb-4 whitespace-pre-line">{q.question}</p>
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct;
          const isPicked = selected === i;
          const showCorrect = answered && isCorrect;
          const showWrong = answered && isPicked && !isCorrect;
          return (
            <button key={i} type="button" disabled={answered} onClick={() => onSelect(i)}
              className={cn("w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all text-sm",
                !answered && "border-ink-200 hover:border-brand-300 hover:bg-brand-50/40 cursor-pointer",
                showCorrect && "border-green-400 bg-green-50",
                showWrong && "border-red-400 bg-red-50",
                answered && !showCorrect && !showWrong && "border-ink-200 opacity-60",
              )}>
              <span className={cn("w-6 h-6 rounded-md flex items-center justify-center text-xs font-mono font-bold shrink-0",
                showCorrect ? "bg-green-500 text-white" : showWrong ? "bg-red-500 text-white" : "bg-ink-100 text-ink-600")}>
                {letters[i]}
              </span>
              <span className={cn("flex-1", showCorrect ? "text-green-800" : showWrong ? "text-red-800" : "text-ink-700")}>{opt}</span>
              {showCorrect && <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />}
              {showWrong && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
            </button>
          );
        })}
      </div>
      {answered && q.explanation && (
        <div className={cn("mt-3 p-3 rounded-lg text-sm border",
          selected === q.correct ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800")}>
          <div className="flex items-center gap-1.5 font-semibold mb-1">
            {selected === q.correct ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {selected === q.correct ? "回答正确" : "回答错误"}
          </div>
          <p className="leading-relaxed">{q.explanation}</p>
        </div>
      )}
    </div>
  );
}

function LearningZoneCard({ zone, current }: { zone: Zone | null; current: number }) {
  return (
    <Card className="p-5">
      <SectionTitle title="学习区" subtitle="舒适区边缘训练模型" />
      {!zone ? (
        <Loading text="加载学习区..." />
      ) : (
        <>
          <div className="flex items-center justify-center py-2">
            <div className="relative w-44 h-44">
              {/* 恐慌区 (外) */}
              <div className="absolute inset-0 rounded-full bg-red-100 border-2 border-red-200 flex items-start justify-center pt-1.5">
                <span className="text-[10px] font-medium text-red-600">恐慌区</span>
              </div>
              {/* 学习区 (中) */}
              <div className="absolute inset-6 rounded-full bg-gold-100 border-2 border-gold-300 flex items-start justify-center pt-1.5">
                <span className="text-[10px] font-medium text-gold-700">学习区</span>
              </div>
              {/* 舒适区 (内) */}
              <div className="absolute inset-12 rounded-full bg-green-100 border-2 border-green-300 flex items-center justify-center">
                <span className="text-[10px] font-medium text-green-700">舒适区</span>
              </div>
              {/* 当前位置指示 */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 mt-6">
                <div className="w-3 h-3 rounded-full bg-brand-600 ring-4 ring-brand-600/20" title="当前难度" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div className="p-2 rounded-lg bg-green-50">
              <div className="text-xs text-green-700 font-medium">舒适区</div>
              <div className="text-sm font-mono font-bold text-green-700">{zone.comfort_zone?.toFixed(2) ?? "—"}</div>
            </div>
            <div className="p-2 rounded-lg bg-gold-50 ring-2 ring-gold-300">
              <div className="text-xs text-gold-700 font-medium">学习区</div>
              <div className="text-sm font-mono font-bold text-gold-700">{zone.learning_zone?.toFixed(2) ?? current.toFixed(2)}</div>
            </div>
            <div className="p-2 rounded-lg bg-red-50">
              <div className="text-xs text-red-700 font-medium">恐慌区</div>
              <div className="text-sm font-mono font-bold text-red-700">{zone.panic_zone?.toFixed(2) ?? "—"}</div>
            </div>
          </div>
          {zone.recommendation && (
            <p className="text-xs text-ink-500 mt-3 leading-relaxed">{zone.recommendation}</p>
          )}
        </>
      )}
    </Card>
  );
}

function SkillTreeCard({ tree }: { tree: Tree | null }) {
  return (
    <Card className="p-5">
      <SectionTitle title="技能树" subtitle={tree?.name ?? "技能分解路径"} />
      {!tree?.nodes?.length ? (
        <EmptyState icon={<Target className="w-8 h-8" />} title="暂无技能树" description="该领域未配置技能分解" />
      ) : (
        <div className="space-y-1.5">
          {tree.nodes.map((n, i) => {
            const meta = LEVEL_META[n.level] ?? LEVEL_META.beginner;
            return (
              <div key={n.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-ink-50 transition-colors">
                <span className="w-6 h-6 rounded-md bg-ink-100 text-ink-500 text-xs font-mono flex items-center justify-center shrink-0">{i + 1}</span>
                <span className="text-sm text-ink-800 flex-1 truncate">{n.name}</span>
                <span className={cn("lf-badge text-[10px]", meta.cls)}>{meta.label}</span>
                {i < tree.nodes!.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-ink-300" />}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
