"""Engine 5 — Critical Thinking Training (学会提问).

Based on M. Neil Browne & Stuart Keeley's *Asking the Right Questions*:
- Sponge vs. panning-for-gold (淘金) reading modes.
- An 11-step critical-argument checklist.
- Logical fallacy detection.
- Evidence reliability grading.
- Hidden assumption excavation.

The rule-based analyzer performs lightweight NLP (pattern + keyword matching)
to produce a structured analysis. With an LLM backend configured, the agent
layer upgrades this to a deep semantic analysis.
"""
from __future__ import annotations

import re
from typing import Any

# --- Fallacy patterns -------------------------------------------------------
# Each entry: (code, name, list of trigger regexes, explanation)
FALLACY_PATTERNS: list[tuple[str, str, list[re.Pattern[str]], str]] = [
    (
        "ad_hominem",
        "人身攻击",
        [re.compile(r"(攻击|谩骂|人格|人品).*?(?:因为|毕竟|就是)", re.S),
         re.compile(r"(你又不是|你又没有|你算什么)", re.S)],
        "针对立论者本人而非其论据进行攻击，论据本身未被反驳。",
    ),
    (
        "slippery_slope",
        "滑坡谬误",
        [re.compile(r"(一旦|如果).{0,20}(最终|最后|必将|势必).{0,12}(灾难|崩溃|毁灭|完蛋)", re.S),
         re.compile(r"(层层|逐步).{0,8}(导致|演变为)", re.S)],
        "假定一连串事件必然连锁发生，却未证明每一步的因果必然性。",
    ),
    (
        "false_dichotomy",
        "非黑即白",
        [re.compile(r"(要么|不是).{0,30}(要么|就是).{0,12}(没有|不存在|不可能)第三", re.S),
         re.compile(r"只有两种(选择|可能|道路)", re.S)],
        "把多种可能压缩为对立两极，忽视中间选项。",
    ),
    (
        "appeal_authority",
        "诉诸权威",
        [re.compile(r"(专家|教授|院士|大佬|名人).{0,8}(都说|认为|表示).{0,20}(所以|因此|必然)", re.S),
         re.compile(r"某某(大|名).{0,6}(说过|的名言)", re.S)],
        "仅凭权威身份支持结论，而非检验证据本身。",
    ),
    (
        "hasty_generalization",
        "以偏概全",
        [re.compile(r"(我(有个|身边|认识)|我的(朋友|同学)).{0,30}(所以|可见|说明).{0,12}(都|所有|全部)", re.S),
         re.compile(r"(几个|少数|个别).{0,12}(证明|说明|意味着).{0,12}(普遍|都|全部)", re.S)],
        "由个别案例直接推出普遍结论，样本不足。",
    ),
    (
        "circular",
        "循环论证",
        [re.compile(r"(.{2,20})因为\1", re.S),
         re.compile(r"(因为.{2,20})所以.{0,6}\1", re.S)],
        "用结论本身作为支持结论的理由。",
    ),
    (
        "bandwagon",
        "诉诸大众",
        [re.compile(r"(大家都|大多数人都|所有人|很多人).{0,12}(这么做|这么认为|相信).{0,12}(所以|因此|肯定)", re.S),
         re.compile(r"(畅销|热门|流行).{0,8}(说明|证明)", re.S)],
        "以『多数人接受』作为真理依据。",
    ),
]

# Indicator words for conclusion vs reasons.
CONCLUSION_HINTS = ["因此", "所以", "可见", "由此", "结论是", "我认为", "总之", "综上"]
REASON_HINTS = ["因为", "由于", "原因是", "理由是", "鉴于", "毕竟", "根据"]
AMBIGUOUS_HINTS = ["可能", "大概", "也许", "比较好", "较大", "较强", "合理", "适当", "一定程度"]

# Evidence types and reliability tiers (0..1).
EVIDENCE_TIERS = {
    "系统综述/meta": 0.95,
    "随机对照/rct": 0.9,
    "队列研究": 0.75,
    "个案对照": 0.6,
    "案例/个案": 0.45,
    "专家意见": 0.4,
    "个人经历": 0.3,
    "传闻/无名": 0.2,
}


class CriticalThinkingEngine:
    @staticmethod
    def split_sentences(text: str) -> list[str]:
        parts = re.split(r"[。！？!?\n；;]+", text)
        return [p.strip() for p in parts if p.strip()]

    @staticmethod
    def detect_conclusion_and_reasons(text: str) -> tuple[str | None, list[str]]:
        sentences = CriticalThinkingEngine.split_sentences(text)
        conclusion: str | None = None
        reasons: list[str] = []
        for s in sentences:
            if not conclusion and any(h in s for h in CONCLUSION_HINTS):
                conclusion = s
            elif any(h in s for h in REASON_HINTS):
                reasons.append(s)
        if not conclusion and sentences:
            conclusion = sentences[-1]
        if not reasons and len(sentences) > 1:
            reasons = sentences[:-1]
        return conclusion, reasons

    @staticmethod
    def detect_fallacies(text: str) -> list[dict[str, Any]]:
        found: list[dict[str, Any]] = []
        for code, name, patterns, explanation in FALLACY_PATTERNS:
            for p in patterns:
                m = p.search(text)
                if m:
                    found.append({
                        "code": code,
                        "name": name,
                        "snippet": m.group(0)[:60],
                        "explanation": explanation,
                    })
                    break
        return found

    @staticmethod
    def detect_ambiguous_terms(text: str) -> list[str]:
        found: list[str] = []
        for h in AMBIGUOUS_HINTS:
            if h in text and h not in found:
                found.append(h)
        return found

    @staticmethod
    def excavate_assumptions(text: str, reasons: list[str], conclusion: str | None) -> list[str]:
        """Heuristic: infer unstated bridges between reasons and conclusion."""
        assumptions: list[str] = []
        if reasons and conclusion:
            assumptions.append(
                "隐含假设：所述理由与结论之间存在直接因果，但作者未给出机制证明。"
            )
        if any("因为大家都" in r or "都这么做" in r for r in reasons):
            assumptions.append("隐含假设：多数人的行为本身即是正确性的依据（需质疑）。")
        if any("专家" in r or "教授" in r for r in reasons):
            assumptions.append("隐含假设：权威在当前议题上具有专业性与利益无涉性。")
        if not assumptions:
            assumptions.append("未检测到明显的逻辑跳跃，建议人工复核理由→结论的因果链。")
        return assumptions

    @staticmethod
    def grade_evidence(text: str) -> list[dict[str, Any]]:
        graded: list[dict[str, Any]] = []
        lowered = text.lower()
        for keyword, reliability in EVIDENCE_TIERS.items():
            if keyword.split("/")[0] in text or keyword in lowered:
                graded.append({"type": keyword, "reliability": reliability})
        if not graded:
            graded.append({"type": "未标注证据类型", "reliability": 0.3})
        return graded

    @staticmethod
    def credibility_score(fallacies: list[dict], evidence: list[dict], assumptions: list[str]) -> float:
        score = 1.0
        score -= 0.15 * len(fallacies)
        avg_ev = sum(e["reliability"] for e in evidence) / max(1, len(evidence))
        score = score * (0.4 + 0.6 * avg_ev)
        if any("多数人的行为" in a or "权威" in a for a in assumptions):
            score -= 0.1
        return round(max(0.0, min(1.0, score)), 3)

    @staticmethod
    def analyze(text: str, mode: str = "panning") -> dict[str, Any]:
        """Run the full 11-step-flavored analysis (rule-based)."""
        conclusion, reasons = CriticalThinkingEngine.detect_conclusion_and_reasons(text)
        ambiguous = CriticalThinkingEngine.detect_ambiguous_terms(text)
        fallacies = CriticalThinkingEngine.detect_fallacies(text)
        assumptions = CriticalThinkingEngine.excavate_assumptions(text, reasons, conclusion)
        evidence = CriticalThinkingEngine.grade_evidence(text)
        credibility = CriticalThinkingEngine.credibility_score(fallacies, evidence, assumptions)
        return {
            "mode": mode,
            "conclusion": conclusion,
            "reasons": reasons,
            "ambiguous_terms": ambiguous,
            "assumptions": assumptions,
            "fallacies": fallacies,
            "evidence_levels": evidence,
            "credibility_score": credibility,
            "checklist": CriticalThinkingEngine._eleven_step_status(conclusion, reasons, fallacies, evidence),
        }

    @staticmethod
    def _eleven_step_status(conclusion, reasons, fallacies, evidence) -> list[dict[str, Any]]:
        steps = [
            ("1. 论题与结论", "完成" if conclusion else "缺失"),
            ("2. 理由", f"{len(reasons)} 条" if reasons else "缺失"),
            ("3. 歧义词", "需人工标注"),
            ("4. 价值冲突/假设", "已启发式挖掘"),
            ("5. 描述性假设", "已启发式挖掘"),
            ("6. 推理谬误", f"{len(fallacies)} 处" if fallacies else "未检出"),
            ("7. 证据质量", f"{len(evidence)} 项"),
            ("8. 替代原因", "需人工思考"),
            ("9. 统计欺骗", "需人工核查"),
            ("10. 遗漏信息", "需人工思考"),
            ("11. 合理结论", "见可信度评分"),
        ]
        return [{"step": s, "status": st} for s, st in steps]
