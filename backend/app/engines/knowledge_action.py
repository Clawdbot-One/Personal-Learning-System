"""Engine 4 — Knowledge-to-Action (知行转化).

Based on the *Knowing-Doing Gap* (Pfeffer & Sutton) and *Know Can Do* (Blanchard):
- Diagnose the knowing-doing gap (收藏多、实践少).
- "Few and essential" filtering — pick 1-2 ideas, not 20.
- Green-light thinking — first imagine potential, then critique.
- Spaced follow-up — a 7-day action plan with reminders.
- Teach others (Feynman) — explain to consolidate.

The engine generates a 7-day action plan from an insight and tracks the
collection-vs-practice ratio to surface the gap.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import ActionItem, ActionPlan, KnowledgeNode, PracticeItem, ReadingNote


# Day-by-day plan template rooted in spaced follow-up (Ebbinghaus-style).
ACTION_TEMPLATE = [
    (1, "明确应用场景：写下这个知识将在什么具体情境下被使用，越具体越好。"),
    (2, "最小可行行动：设计一个 15 分钟内可完成的最小实验，今天执行。"),
    (3, "反馈记录：记录实验结果，标注一个有效点与一个待改进点。"),
    (4, "迭代放大：基于反馈调整做法，将行动扩展到更大范围或更长时间。"),
    (5, "教授他人：用自己的话向同事/朋友解释这个知识（费曼输出）。"),
    (6, "间隔复述：不看资料，默写或口述知识要点与你的实践案例。"),
    (7, "复盘固化：写出『我将长期保留的习惯』，并决定是否升级为日常仪式。"),
]


class KnowledgeActionEngine:
    @staticmethod
    def generate_action_plan(user_id: str, title: str, source_concept: Optional[str], insight: Optional[str]) -> ActionPlan:
        """Create a 7-day action plan from a distilled insight."""
        plan = ActionPlan(
            user_id=user_id,
            title=title,
            source_concept=source_concept,
            insight=insight,
            status="active",
            progress=0.0,
        )
        for day, content in ACTION_TEMPLATE:
            plan.items.append(ActionItem(user_id=user_id, day=day, content=content))
        return plan

    @staticmethod
    def recompute_progress(plan: ActionPlan) -> float:
        if not plan.items:
            return 0.0
        done = sum(1 for i in plan.items if i.is_done)
        plan.progress = round(done / len(plan.items), 3)
        if plan.progress >= 1.0:
            plan.status = "done"
        return plan.progress

    @staticmethod
    def knowing_doing_gap(db: Session, user_id: str) -> dict:
        """收藏量 vs 实践量：识别知行断裂最严重的概念."""
        collected = db.scalar(select(func.count(KnowledgeNode.id)).where(KnowledgeNode.user_id == user_id)) or 0
        notes = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.is_highlight.is_(True))) or 0
        practiced = db.scalar(select(func.count(PracticeItem.id)).where(PracticeItem.user_id == user_id)) or 0
        action_items_done = db.scalar(
            select(func.count(ActionItem.id)).where(ActionItem.user_id == user_id, ActionItem.is_done.is_(True))
        ) or 0
        collected_total = collected + notes
        practice_total = practiced + action_items_done
        gap_ratio = 0.0
        if collected_total > 0:
            gap_ratio = round(1.0 - (practice_total / collected_total), 3)
        verdict = (
            "健康" if gap_ratio < 0.4
            else "轻度断裂" if gap_ratio < 0.7
            else "严重断裂"
        )
        return {
            "collected": collected_total,
            "practiced": practice_total,
            "gap_ratio": gap_ratio,
            "verdict": verdict,
            "advice": (
                "采用『少而精』原则：暂停新增收藏，从已有概念中选 1-2 个进入 7 天行动计划。"
                if gap_ratio >= 0.7
                else "保持输入与输出的平衡，建议每周至少完成 1 个费曼输出。"
            ),
        }

    @staticmethod
    def green_light_eval(idea: str) -> dict:
        """Two-step green-light → red-light evaluation of a new idea."""
        green = [
            "这个想法在什么条件下可能成立？",
            "如果成立，它最大的潜在价值是什么？",
            "有哪些最小成本的验证方式？",
        ]
        red = [
            "它的关键假设是什么？这些假设是否经过检验？",
            "是否存在反面证据或适用边界？",
            "如果失败，最大的风险与可承受性如何？",
        ]
        return {"stage": "green_light", "green_questions": green, "red_questions": red, "idea": idea}

    @staticmethod
    def feynman_check(explanation: str) -> dict:
        """Evaluate a Feynman-style explanation for blind spots (rule-based)."""
        length = len(explanation)
        has_example = any(k in explanation for k in ("例如", "比如", "举例", "例如", "e.g.", "such as"))
        has_analogy = any(k in explanation for k in ("就像", "相当于", "好比", "类似"))
        jargon_density = sum(1 for w in ["范式", "底层逻辑", "赋能", "闭环", "抓手"] if w in explanation)
        blind_spots = []
        if length < 60:
            blind_spots.append("解释过短，可能尚未真正消化。")
        if not has_example:
            blind_spots.append("缺少具体例子，建议补充一个生活化案例。")
        if not has_analogy:
            blind_spots.append("缺少类比，用熟悉事物映射可加深听众理解。")
        if jargon_density >= 2:
            blind_spots.append("术语堆砌，可能掩盖了理解缺口，请用大白话重写。")
        score = max(0.0, 1.0 - 0.2 * len(blind_spots))
        return {"score": round(score, 2), "blind_spots": blind_spots or ["未发现明显盲区，解释质量良好。"]}
