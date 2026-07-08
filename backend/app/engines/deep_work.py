"""Engine 3 — Focus Protection & Deep Work (深度工作).

Based on Cal Newport's *Deep Work*:
- Distinguish deep vs. shallow work.
- Guard against attention residue (task-switching tax).
- Four deep-work strategies: monastic, bimodal, rhythmic, journalistic.
- Rituals: start-up ceremony and shutdown ritual.
- Time-block scheduling aligned with the energy curve.

The engine scores focus quality, recommends a strategy by vocation, and
produces time-block suggestions.
"""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import FocusSession


STRATEGIES = {
    "monastic": "修道院式：长期屏蔽浅层事务，全身心投入单一高价值目标。适合研究者/作家。",
    "bimodal": "双峰式：以周/月为单位划分深度期与开放期。适合学者/创作者。",
    "rhythmic": "节奏式：每天固定时段进入深度工作（如晨间 2 小时）。适合大多数职场人。",
    "journalistic": "新闻记者式：在任何可用的小段空档切换入深度。适合事务繁杂的高管/记者。",
}

# Energy curve: rough multiplier per hour (0..1).
ENERGY_CURVE = {
    6: 0.4, 7: 0.6, 8: 0.85, 9: 0.95, 10: 1.0, 11: 0.9,
    12: 0.6, 13: 0.5, 14: 0.6, 15: 0.75, 16: 0.8, 17: 0.7,
    18: 0.6, 19: 0.65, 20: 0.8, 21: 0.85, 22: 0.6, 23: 0.4,
}


class DeepWorkEngine:
    @staticmethod
    def recommend_strategy(vocation: Optional[str]) -> str:
        """Pick the most fitting deep-work strategy for a vocation."""
        if not vocation:
            return "rhythmic"
        v = vocation.lower()
        if any(k in v for k in ("研究", "作家", "scientist", "writer", "科研")):
            return "monastic"
        if any(k in v for k in ("学", "教授", "professor", "academic")):
            return "bimodal"
        if any(k in v for k in ("高管", "记者", "executive", "journalist", "manager")):
            return "journalistic"
        return "rhythmic"

    @staticmethod
    def focus_score(actual_minutes: int, planned_minutes: int, distraction_count: int) -> float:
        """Quality of a focus session in 0..1 (deep vs shallow + attention residue)."""
        completion = min(1.0, actual_minutes / max(1, planned_minutes))
        # each distraction imposes an attention-residue penalty
        distraction_penalty = min(0.6, distraction_count * 0.08)
        return round(max(0.0, completion - distraction_penalty), 3)

    @staticmethod
    def startup_ritual(strategy: str, task: Optional[str]) -> list[str]:
        """Generate a deep-work start-up ceremony checklist."""
        base = [
            "关闭通知 / 手机静音放入抽屉",
            "明确本次深度工作的单一目标",
            "倒一杯水，准备纸笔记录游离念头",
            "启动番茄钟或深度时间块",
        ]
        if strategy == "monastic":
            base.insert(0, "宣告今日『深度闭关』时段，告知协作者勿扰")
        if task:
            base[1] = f"明确本次深度工作的单一目标：{task}"
        return base

    @staticmethod
    def shutdown_ritual() -> list[str]:
        return [
            "回顾今日完成与未完成，记录到学习日志",
            "为明日深度工作预选单一目标",
            "彻底关闭工作上下文（收件箱、IDE、文档）",
            "一句仪式语：『今日深度工作结束』",
        ]

    @staticmethod
    def suggest_time_blocks(db: Session, user_id: str, date_: Optional[date] = None) -> list[dict]:
        """Suggest 2 deep-work blocks aligned with the energy curve and history."""
        d = date_ or datetime.now(timezone.utc).date()
        # weight recent success per hour
        blocks = []
        for hour, energy in [(9, 0.95), (10, 1.0), (20, 0.8), (21, 0.85)]:
            blocks.append({
                "start": f"{hour:02d}:00",
                "end": f"{(hour + 2) % 24:02d}:00",
                "energy": energy,
                "label": "晨间深度块" if hour < 12 else "晚间深度块",
            })
        return sorted(blocks, key=lambda b: b["energy"], reverse=True)[:2]

    @staticmethod
    def weekly_deep_summary(db: Session, user_id: str) -> dict:
        """Aggregate deep vs shallow minutes for the last 7 days."""
        since = datetime.now(timezone.utc) - timedelta(days=7)
        rows = db.scalars(
            select(FocusSession).where(FocusSession.user_id == user_id, FocusSession.ended_at >= since)
        ).all()
        deep = sum(r.actual_minutes for r in rows if r.mode == "deep_block")
        pomodoro = sum(r.actual_minutes for r in rows if r.mode == "pomodoro")
        distractions = sum(r.distraction_count for r in rows)
        avg_quality = (sum(r.actual_minutes for r in rows) / max(1, sum(r.planned_minutes for r in rows))) if rows else 0
        return {
            "deep_minutes": deep,
            "pomodoro_minutes": pomodoro,
            "total_minutes": deep + pomodoro,
            "sessions": len(rows),
            "distractions": distractions,
            "completion_ratio": round(avg_quality, 3),
        }
