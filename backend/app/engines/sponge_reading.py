"""Engine 2 — Progressive Reading & Knowledge Internalization (海绵阅读法).

Based on 李小墨's *海绵阅读法*:
- Three-layer note structure: fragment (片段) → chapter (章节) → whole-book (全书).
- Seven reading abilities: 选书 / 速读 / 精读 / 记忆 / 理解 / 应用 / 输出.
- Four-stage progression: 入门 → 进阶 → 成熟 → 高手.
- Pain-point diagnosis and structured output (mind map + reading report).

The engine extracts concepts from notes (building blocks of the knowledge
graph), diagnoses the reader's stage from behavior, and recommends a strategy.
"""
from __future__ import annotations

import re
from typing import Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..models import KnowledgeNode, ReadingBook, ReadingNote


# Seven abilities tracked on a 0..1 radar.
SEVEN_ABILITIES = ["选书", "速读", "精读", "记忆", "理解", "应用", "输出"]

# Stage thresholds by total refined notes count.
STAGE_THRESHOLDS = [(5, 1, "入门"), (20, 2, "进阶"), (60, 3, "成熟"), (10**9, 4, "高手")]

# Lightweight concept-extraction patterns. In production this would be an LLM
# call; the rule-based version keeps the engine fully functional offline.
_CONCEPT_HINT = re.compile(r"[【\[]([^\】\]]{2,24})[】\]]")
_QUOTED = re.compile(r"[「“\"]([^”」\"]{2,24})[」”\"]")
_KEYPHRASE = re.compile(r"(?:称为|叫做|是指|定义|概念)[：:]?\s*([^\n，。；]{2,24})")


class SpongeReadingEngine:
    @staticmethod
    def extract_concepts(content: str) -> list[str]:
        """Pull candidate concepts out of a note body."""
        found: list[str] = []
        for rx in (_CONCEPT_HINT, _QUOTED, _KEYPHRASE):
            for m in rx.findall(content):
                t = m.strip()
                if 2 <= len(t) <= 24 and t not in found:
                    found.append(t)
        # fallback: capitalized words / CJK noun-like tokens (whitespace split)
        if not found:
            for tok in re.split(r"[，。；,\s]+", content):
                if 2 <= len(tok) <= 24 and re.search(r"[\u4e00-\u9fa5A-Z]", tok):
                    found.append(tok)
        return found[:8]

    @staticmethod
    def build_knowledge_from_note(db: Session, note: ReadingNote) -> list[KnowledgeNode]:
        """Create knowledge nodes for each extracted concept (idempotent by concept)."""
        existing = {
            n.concept: n
            for n in db.scalars(
                select(KnowledgeNode).where(KnowledgeNode.user_id == note.user_id)
            ).all()
        }
        created: list[KnowledgeNode] = []
        for concept in SpongeReadingEngine.extract_concepts(note.content):
            if concept in existing:
                continue
            node = KnowledgeNode(
                user_id=note.user_id,
                concept=concept,
                description=f"来源：{note.page_ref or '阅读笔记'}",
                category="reading",
                mastery=0.1,
                source_note_id=note.id,
            )
            db.add(node)
            created.append(node)
            existing[concept] = node
        db.flush()
        return created

    @staticmethod
    def diagnose_stage(db: Session, user_id: str) -> dict:
        """Determine the reader's stage from note volume and layer distribution."""
        total = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id)) or 0
        layer3 = db.scalar(
            select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.layer == 3)
        ) or 0
        for threshold, stage_num, stage_name in STAGE_THRESHOLDS:
            if total < threshold:
                return {
                    "stage": stage_num,
                    "stage_name": stage_name,
                    "total_notes": total,
                    "whole_book_notes": layer3,
                    "recommendation": SpongeReadingEngine._stage_advice(stage_num, total, layer3),
                }
        return {"stage": 4, "stage_name": "高手", "total_notes": total, "whole_book_notes": layer3, "recommendation": ""}

    @staticmethod
    def _stage_advice(stage: int, total: int, layer3: int) -> str:
        advice = {
            1: "你处于入门阶段：聚焦『选书』与『速读』，先建立三层笔记中的片段层（Layer 1），积累金句与关键概念。",
            2: "进阶阶段：开始章节层（Layer 2）归纳，训练『精读』与『理解』，每周完成 1 篇章节笔记。",
            3: "成熟阶段：强化全书层（Layer 3）输出与『应用』，把知识接入行动与费曼输出。",
            4: "高手阶段：聚焦『输出』，将多本书横向对比、构建跨领域知识图谱。",
        }
        if layer3 == 0 and stage >= 2:
            return advice[stage] + " 当前缺少全书层笔记，建议为已读完的书补一篇全书总结。"
        return advice[stage]

    @staticmethod
    def ability_radar(db: Session, user_id: str) -> dict[str, float]:
        """Approximate the seven-ability radar from note/reading behavior."""
        total = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id)) or 0
        books = db.scalar(select(func.count(ReadingBook.id)).where(ReadingBook.user_id == user_id)) or 0
        layer1 = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.layer == 1)) or 0
        layer2 = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.layer == 2)) or 0
        layer3 = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.layer == 3)) or 0
        highlights = db.scalar(select(func.count(ReadingNote.id)).where(ReadingNote.user_id == user_id, ReadingNote.is_highlight.is_(True))) or 0

        def _scale(v: float, cap: float) -> float:
            return round(min(1.0, v / cap), 2)

        return {
            "选书": _scale(books, 12),
            "速读": _scale(layer1, 60),
            "精读": _scale(layer2, 30),
            "记忆": _scale(highlights, 50),
            "理解": _scale(layer2 + layer3, 40),
            "应用": _scale(layer3, 15),
            "输出": _scale(layer3, 10),
        }

    @staticmethod
    def generate_report_skeleton(book: ReadingBook, notes: list[ReadingNote]) -> str:
        """Assemble a structured reading report from layered notes (费曼-ready)."""
        layer1 = [n for n in notes if n.layer == 1]
        layer2 = [n for n in notes if n.layer == 2]
        layer3 = [n for n in notes if n.layer == 3]
        lines = [f"# 《{book.title}》读书报告", ""]
        lines.append("## 一、全书一句话")
        lines.append(layer3[0].content if layer3 else "（待补充：用一句话概括全书核心论点）")
        lines.append("\n## 二、核心章节脉络")
        if layer2:
            for n in layer2[:6]:
                lines.append(f"- {n.content}")
        else:
            lines.append("（待补充：提炼 3-5 个章节主旨）")
        lines.append("\n## 三、关键金句与概念")
        for n in layer1[:8]:
            lines.append(f"> {n.content}")
        lines.append("\n## 四、对我的启发与行动")
        lines.append("（待补充：将 1-2 个最有价值的洞察接入『知行转化』引擎，生成 7 天行动计划）")
        return "\n".join(lines)
