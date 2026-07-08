"""Cross-discipline reward engine (Psychology + Sociology + Finance).

The reward system fuses three disciplines as specified in the PRD:

Psychology (intrinsic motivation first, SDT):
- Self-Determination Theory: autonomy / competence / relatedness.
- Flow: challenge-skill balance is handled by the deliberate-practice engine;
  rewards are summarised *after* a flow block, never mid-flow.
- Reward prediction error (dopamine): occasional surprise boxes.
- Operant conditioning: continuous reinforcement early → variable-ratio later.

Sociology (identity, belonging, social capital):
- Group tags, mentorship, leaderboards (only top-N + self to avoid demotivation).
- Reputation points.

Finance (token economy):
- Tokens minted by learning, burned on redemption, staked in commitment
  contracts. Learning "futures/options" lock a stake against a deadline.
- ROI quantification (time invested vs. mastery gained).

All grants write an immutable Reward ledger entry and update the user balance.
"""
from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..models import (
    Achievement,
    ActionPlan,
    CommitmentContract,
    CriticalAnalysis,
    FocusSession,
    KnowledgeNode,
    PracticeAttempt,
    PracticeItem,
    ReadingNote,
    Reward,
    User,
    UserAchievement,
)


# --- Achievement catalog (seeded at startup) --------------------------------
# criterion is matched against a computed metric for the user.
ACHIEVEMENT_CATALOG: list[dict] = [
    {"code": "first_focus", "name": "初次深度", "description": "完成你的第一次深度工作会话", "dimension": "psychology", "icon": "🎯", "threshold": 1, "criterion": "focus_sessions"},
    {"code": "streak_3", "name": "三日不辍", "description": "连续学习满 3 天", "dimension": "psychology", "icon": "🔥", "threshold": 3, "criterion": "streak_days"},
    {"code": "streak_7", "name": "一周坚持", "description": "连续学习满 7 天", "dimension": "psychology", "icon": "⚡", "threshold": 7, "criterion": "streak_days"},
    {"code": "streak_30", "name": "月度行者", "description": "连续学习满 30 天", "dimension": "psychology", "icon": "💎", "threshold": 30, "criterion": "streak_days"},
    {"code": "focus_500", "name": "深度匠人", "description": "累计深度专注 500 分钟", "dimension": "psychology", "icon": "🧠", "threshold": 500, "criterion": "focus_minutes"},
    {"code": "focus_2000", "name": "深度大师", "description": "累计深度专注 2000 分钟", "dimension": "psychology", "icon": "🏆", "threshold": 2000, "criterion": "focus_minutes"},
    {"code": "practice_50", "name": "勤练者", "description": "累计答对 50 道练习", "dimension": "psychology", "icon": "✏️", "threshold": 50, "criterion": "practice_correct"},
    {"code": "practice_500", "name": "刻意精进", "description": "累计答对 500 道练习", "dimension": "psychology", "icon": "🥇", "threshold": 500, "criterion": "practice_correct"},
    {"code": "notes_20", "name": "笔记达人", "description": "写下 20 条阅读笔记", "dimension": "finance", "icon": "📚", "threshold": 20, "criterion": "notes_count"},
    {"code": "knowledge_30", "name": "知识织网", "description": "知识图谱达到 30 个节点", "dimension": "finance", "icon": "🕸️", "threshold": 30, "criterion": "knowledge_nodes"},
    {"code": "action_done", "name": "知行合一", "description": "完成一个 7 天行动计划", "dimension": "finance", "icon": "🔗", "threshold": 1, "criterion": "action_plans_done"},
    {"code": "critical_5", "name": "思辨者", "description": "完成 5 次批判性分析", "dimension": "social", "icon": "🔍", "threshold": 5, "criterion": "critical_analyses"},
    {"code": "social_join", "name": "同路人", "description": "加入一个学习小组", "dimension": "social", "icon": "👥", "threshold": 1, "criterion": "groups_joined"},
    {"code": "contract_win", "name": "言出必行", "description": "成功兑现一份学习期货", "dimension": "finance", "icon": "📈", "threshold": 1, "criterion": "contracts_won"},
    {"code": "token_rich", "name": "学习富翁", "description": "学习积分达到 1000", "dimension": "finance", "icon": "🪙", "threshold": 1000, "criterion": "token_balance"},
]


class RewardService:
    """Unified reward granting + achievement detection."""

    # --- token ledger -------------------------------------------------------
    @staticmethod
    def grant(
        db: Session,
        user: User,
        dimension: str,
        reward_type: str,
        points: int,
        reason: Optional[str] = None,
        meta: Optional[dict] = None,
    ) -> Reward:
        """Apply a signed token delta and append an immutable ledger entry."""
        user.token_balance = max(0, user.token_balance + points)
        entry = Reward(
            user_id=user.id,
            dimension=dimension,
            reward_type=reward_type,
            points=points,
            balance_after=user.token_balance,
            reason=reason,
            meta=meta or {},
        )
        db.add(entry)
        db.flush()
        return entry

    # --- streak (psychology: consistency) -----------------------------------
    @staticmethod
    def update_streak(db: Session, user: User) -> int:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        if user.last_active_date == today:
            return user.streak_days
        from datetime import datetime as _dt, timedelta as _td
        yesterday = (_dt.utcnow() - _td(days=1)).strftime("%Y-%m-%d")
        if user.last_active_date == yesterday:
            user.streak_days += 1
        elif user.last_active_date is None:
            user.streak_days = 1
        else:
            user.streak_days = 1  # streak broken
        user.last_active_date = today
        db.flush()
        return user.streak_days

    # --- surprise box (dopamine: reward prediction error) -------------------
    @staticmethod
    def maybe_surprise(db: Session, user: User, base_points: int) -> Optional[Reward]:
        """Variable-ratio surprise reward. Probability scales down with usage.

        Early users get frequent surprises (continuous reinforcement); mature
        users get rarer, bigger surprises (variable-ratio, strongest habit loop).
        """
        prob = max(0.05, 0.35 - 0.01 * min(30, user.streak_days))
        if random.random() < prob:
            multiplier = random.choice([2, 2, 3, 3, 5])  # occasional jackpot
            bonus = base_points * (multiplier - 1)
            if bonus > 0:
                return RewardService.grant(
                    db, user, "psychology", "surprise", bonus,
                    reason=f"惊喜宝箱 ×{multiplier}！",
                    meta={"multiplier": multiplier, "jackpot": multiplier >= 5},
                )
        return None

    # --- metrics for achievement checks -------------------------------------
    @staticmethod
    def user_metrics(db: Session, user: User) -> dict[str, int]:
        uid = user.id
        focus_sessions = db.scalar(select(func.count(FocusSession.id)).where(FocusSession.user_id == uid)) or 0
        focus_minutes = db.scalar(select(func.coalesce(func.sum(FocusSession.actual_minutes), 0)).where(FocusSession.user_id == uid)) or 0
        practice_correct = db.scalar(select(func.sum(PracticeItem.times_correct)).where(PracticeItem.user_id == uid)) or 0
        notes_count = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == uid)) or 0
        knowledge_nodes = db.scalar(select(func.count(KnowledgeNode.id)).where(KnowledgeNode.user_id == uid)) or 0
        action_plans_done = db.scalar(select(func.count(ActionPlan.id)).where(ActionPlan.user_id == uid, ActionPlan.status == "done")) or 0
        critical_analyses = db.scalar(select(func.count(CriticalAnalysis.id)).where(CriticalAnalysis.user_id == uid)) or 0
        contracts_won = db.scalar(select(func.count(CommitmentContract.id)).where(CommitmentContract.user_id == uid, CommitmentContract.status == "succeeded")) or 0
        groups_joined = 0  # filled by social layer when needed
        return {
            "focus_sessions": focus_sessions,
            "focus_minutes": int(focus_minutes),
            "practice_correct": int(practice_correct),
            "notes_count": notes_count,
            "knowledge_nodes": knowledge_nodes,
            "action_plans_done": action_plans_done,
            "critical_analyses": critical_analyses,
            "contracts_won": contracts_won,
            "groups_joined": groups_joined,
            "streak_days": user.streak_days,
            "token_balance": user.token_balance,
        }

    @staticmethod
    def check_achievements(db: Session, user: User, metrics: Optional[dict] = None) -> list[Achievement]:
        """Award any newly-qualified achievements. Returns newly unlocked list."""
        metrics = metrics or RewardService.user_metrics(db, user)
        already = {
            ua.achievement_code for ua in db.scalars(select(UserAchievement).where(UserAchievement.user_id == user.id)).all()
        }
        newly: list[Achievement] = []
        for ach in db.scalars(select(Achievement)).all():
            if ach.code in already:
                continue
            value = metrics.get(ach.criterion, 0)
            if value >= ach.threshold:
                db.add(UserAchievement(user_id=user.id, achievement_code=ach.code))
                # social capital: reputation boost
                user.reputation += 5
                RewardService.grant(
                    db, user, ach.dimension, "badge", 20,
                    reason=f"解锁成就：{ach.name}",
                    meta={"achievement": ach.code},
                )
                newly.append(ach)
        if newly:
            db.flush()
        return newly

    # --- finance: commitment contract lifecycle -----------------------------
    @staticmethod
    def settle_contract(db: Session, contract: CommitmentContract, user: User, success: bool) -> None:
        """Settle a learning future: return stake + reward on success, forfeit on failure."""
        if contract.status != "active":
            return
        now = datetime.now(timezone.utc)
        contract.settled_at = now
        if success:
            contract.status = "succeeded"
            RewardService.grant(
                db, user, "finance", "contract_payout", contract.stake + contract.reward,
                reason=f"学习期货兑现：{contract.title}",
                meta={"contract_id": contract.id, "stake": contract.stake, "reward": contract.reward},
            )
        else:
            contract.status = "failed"
            # stake already locked at creation; tokens burned (deflationary)
            RewardService.grant(
                db, user, "finance", "contract_forfeit", -contract.stake,
                reason=f"学习期货未兑现（损失厌恶）：{contract.title}",
                meta={"contract_id": contract.id, "stake": contract.stake},
            )
        db.flush()

    @staticmethod
    def create_contract(db: Session, user: User, *, plan_id, title, stake, reward, deadline) -> CommitmentContract:
        """Lock tokens into a commitment contract (learning future)."""
        if user.token_balance < stake:
            raise ValueError("积分余额不足以下注该学习期货")
        user.token_balance -= stake  # lock
        contract = CommitmentContract(
            user_id=user.id, plan_id=plan_id, title=title,
            stake=stake, reward=reward, deadline=deadline, status="active",
        )
        db.add(contract)
        RewardService.grant(
            db, user, "finance", "contract_stake", 0,
            reason=f"锁定学习期货保证金：{title}",
            meta={"stake": stake, "deadline": deadline.isoformat()},
        )
        db.flush()
        return contract

    # --- finance: ROI quantification ----------------------------------------
    @staticmethod
    def learning_roi(db: Session, user: User) -> dict:
        """投入 (时间+专注) vs 产出 (掌握度+技能提升+成果)."""
        metrics = RewardService.user_metrics(db, user)
        invested = metrics["focus_minutes"]
        # outputs
        mastery = db.scalar(select(func.avg(KnowledgeNode.mastery)).where(KnowledgeNode.user_id == user.id)) or 0
        outputs = (
            metrics["practice_correct"] * 1
            + metrics["notes_count"] * 0.5
            + metrics["action_plans_done"] * 5
            + metrics["knowledge_nodes"] * 0.3
            + float(mastery) * 50
        )
        roi = round(outputs / max(1, invested), 3)
        return {
            "invested_minutes": invested,
            "output_score": round(outputs, 2),
            "roi_per_minute": roi,
            "verdict": "高效" if roi >= 0.8 else "平稳" if roi >= 0.4 else "需优化投入产出比",
        }
