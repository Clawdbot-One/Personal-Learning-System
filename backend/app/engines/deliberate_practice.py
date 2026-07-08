"""Engine 1 — Adaptive Deliberate Practice (刻意练习).

Grounded in Anders Ericsson's *Peak*: deliberate practice rests on (1) building
mental representations, (2) training at the edge of the comfort zone, (3)
immediate feedback, (4) skill decomposition, and (5) expert coaching.

This engine provides:
- An SM-2 spaced-repetition scheduler (immediate feedback + memory consolidation).
- A simplified Item-Response-Theory (IRT 3PL) ability/difficulty model that
  keeps the learner in the "learning zone" (~70-80% expected success, the
  challenge-skill balance that supports flow).
- A skill-tree bottleneck detector (skill decomposition + focused coaching).
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import PracticeAttempt, PracticeItem, SkillNode


# SM-2 intervals (days) for each quality grade 0..5
SM2_INTERVALS = {0: 1, 1: 1, 2: 1, 3: 2, 4: 4, 5: 9}
DEFAULT_EASE = 2.5
LEARNING_ZONE_MIN = 0.70
LEARNING_ZONE_MAX = 0.85


def _irt_success_probability(theta: float, difficulty: float, guess: float = 0.25) -> float:
    """3PL-style probability of a correct response."""
    z = 1.7 * (theta - difficulty)
    return guess + (1 - guess) / (1 + pow(2.718281828, -z))


class DeliberatePracticeEngine:
    """Stateless helpers operating on a DB session."""

    @staticmethod
    def schedule_review(item: PracticeItem, quality: int) -> None:
        """Apply SM-2 to update ease, interval and next review time in place.

        quality: 0..5 self-rating (0=total blackout, 5=perfect).
        """
        quality = max(0, min(5, quality))
        item.times_reviewed += 1
        if quality >= 3:
            item.times_correct += 1

        # ease factor update (SM-2)
        item.ease_factor = max(1.3, item.ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

        if quality < 3:
            # lapse: reset interval, relearn soon
            item.review_interval_days = 1
        else:
            if item.times_correct == 1:
                item.review_interval_days = 1
            elif item.times_correct == 2:
                item.review_interval_days = SM2_INTERVALS.get(quality, 4)
            else:
                item.review_interval_days = max(1, round(item.review_interval_days * item.ease_factor))

        item.next_review_at = datetime.now(timezone.utc) + timedelta(days=item.review_interval_days)

    @staticmethod
    def adapt_difficulty(item: PracticeItem, user_theta: float) -> float:
        """Move item difficulty toward the learning zone for this learner.

        Keeps expected success probability inside [0.70, 0.85]; nudges harder
        when the learner consistently succeeds, easier when they fail.
        """
        p = _irt_success_probability(user_theta, item.difficulty)
        if p > LEARNING_ZONE_MAX:
            item.difficulty = min(1.0, item.difficulty + 0.08)
        elif p < LEARNING_ZONE_MIN:
            item.difficulty = max(0.05, item.difficulty - 0.08)
        return item.difficulty

    @staticmethod
    def estimate_user_theta(db: Session, user_id: str) -> float:
        """Estimate latent ability from recent attempts (mean correctness mapped to theta)."""
        recent = db.scalars(
            select(PracticeAttempt).where(PracticeAttempt.user_id == user_id).order_by(PracticeAttempt.created_at.desc()).limit(30)
        ).all()
        if not recent:
            return 0.3
        correct = sum(1 for a in recent if a.is_correct)
        ratio = correct / len(recent)
        # map ratio in [0,1] to theta in [-2, 2] roughly
        return -2.0 + ratio * 4.0

    @staticmethod
    def next_review_queue(db: Session, user_id: str, limit: int = 10) -> list[PracticeItem]:
        """Return items due for review, ordered by how overdue they are."""
        now = datetime.now(timezone.utc)
        stmt = (
            select(PracticeItem)
            .where(PracticeItem.user_id == user_id, PracticeItem.next_review_at <= now)
            .order_by(PracticeItem.next_review_at.asc())
            .limit(limit)
        )
        return list(db.scalars(stmt).all())

    @staticmethod
    def detect_bottlenecks(db: Session, user_id: str) -> list[SkillNode]:
        """A skill node is a bottleneck if mastery is low AND it has children blocking progress."""
        skills = db.scalars(
            select(SkillNode).where(SkillNode.user_id == user_id).order_by(SkillNode.order_index)
        ).all()
        bottlenecks: list[SkillNode] = []
        for s in skills:
            s.is_bottleneck = s.level < 0.4 and any(c.level < 0.4 for c in s.children)
            if s.is_bottleneck:
                bottlenecks.append(s)
        db.flush()
        return bottlenecks

    @staticmethod
    def coach_feedback(item: PracticeItem, attempt: PracticeAttempt) -> str:
        """Virtual coach immediate feedback — root-cause oriented."""
        if attempt.is_correct:
            if attempt.quality >= 5:
                return f"出色！你对「{item.question[:24]}…」的心理表征已稳固，进入扩展难度阶段。"
            return f"正确。建议复述一遍关键步骤以强化记忆，下次复习间隔将延长。"
        root = "概念混淆" if item.item_type == "recall" else "未建立操作链条"
        return f"未达熟练。根因诊断：{root}。建议：拆解为更小单元重练，并回到前置概念巩固。"
