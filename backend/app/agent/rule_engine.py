"""Deterministic rule-based agent engine.

Provides always-available, methodology-grounded responses per agent role. This
is the fallback when no LLM is configured and also the source of structured
"scaffolding" (plans, checklists, templates) that an LLM can later enrich.
"""
from __future__ import annotations

import re
from typing import Any


# Role display metadata.
ROLE_PROFILES = {
    "planner": {"name": "学习规划师", "icon": "🧭", "engine": "战略调度"},
    "reading": {"name": "阅读导师", "icon": "📖", "engine": "海绵阅读法"},
    "practice": {"name": "练习导师", "icon": "✏️", "engine": "刻意练习"},
    "focus": {"name": "专注导师", "icon": "🎯", "engine": "深度工作"},
    "thinking": {"name": "思维导师", "icon": "🔍", "engine": "学会提问"},
    "action": {"name": "行动导师", "icon": "🔗", "engine": "知行转化"},
}


def _has(text: str, *keys: str) -> bool:
    return any(k in text for k in keys)


class RuleAgent:
    """Per-role deterministic responder."""

    @staticmethod
    def respond(role: str, message: str, context: dict[str, Any]) -> str:
        handler = {
            "planner": RuleAgent._planner,
            "reading": RuleAgent._reading,
            "practice": RuleAgent._practice,
            "focus": RuleAgent._focus,
            "thinking": RuleAgent._thinking,
            "action": RuleAgent._action,
        }.get(role, RuleAgent._planner)
        return handler(message, context)

    # --- planner ------------------------------------------------------------
    @staticmethod
    def _planner(message: str, ctx: dict) -> str:
        active_plans = ctx.get("active_plans", 0)
        streak = ctx.get("streak_days", 0)
        if _has(message, "计划", "规划", "目标", "学什么", "安排"):
            return (
                "我是你的学习规划师。我会按『目标拆解 → 里程碑 → 每日任务』帮你建立可执行路径。\n\n"
                "建议步骤：\n"
                "1. 在『学习计划』页创建一个 SMART 目标（具体、可衡量、可达成、相关、有时限）。\n"
                "2. 我会把目标拆解为里程碑与微技能树，并标注前置依赖。\n"
                "3. 根据《深度工作》，我会结合你的精力曲线安排每日 1-2 个深度时间块。\n"
                "4. 根据《刻意练习》，把任务难度锚定在你的『学习区』（约 70-80% 成功率）。\n\n"
                f"当前你有 {active_plans} 个进行中的计划，连续学习 {streak} 天。"
                " 告诉我你的学习目标（例如『3 个月内掌握 Python 数据分析』），我来生成方案。"
            )
        if _has(message, "瓶颈", "卡住", "没有进步", " plateau"):
            return (
                "遇到瓶颈时，《刻意练习》的建议是：\n"
                "1. 退回上一层技能，确认心理表征是否扎实。\n"
                "2. 找到具体的薄弱子环节（而非整体重复）。\n"
                "3. 引入即时反馈或外部教练视角。\n"
                "4. 暂时降低难度回到学习区，重建成功体验。\n\n"
                "你可以在『练习中心』查看我标记的瓶颈节点。"
            )
        return (
            "我是学习规划师，负责目标拆解、路径规划与进度调度。"
            "你可以问我：如何制定学习计划、如何突破瓶颈、如何安排每日深度时间。"
        )

    # --- reading ------------------------------------------------------------
    @staticmethod
    def _reading(message: str, ctx: dict) -> str:
        stage = ctx.get("reading_stage", "入门")
        if _has(message, "笔记", "怎么记", "三层"):
            return (
                "《海绵阅读法》的三层笔记结构：\n"
                "- Layer 1 片段层：金句、关键概念、触动点（速读时随手记）。\n"
                "- Layer 2 章节层：每章用 1-3 句话归纳主旨与逻辑。\n"
                "- Layer 3 全书层：用一句话概括全书核心论点 + 对我的行动启发。\n\n"
                "在『阅读工作台』选择层级保存笔记，我会自动提取概念加入你的知识图谱。"
            )
        if _has(message, "读不完", "读得慢", "记不住", "忘记"):
            return (
                f"你当前处于『{stage}』阶段。常见痛点与对策：\n"
                "- 读得慢：先速读建立框架，再精读重点章节，而非逐字通读。\n"
                "- 记不住：用三层笔记 + 间隔复述（接入刻意练习引擎）。\n"
                "- 不会用：每本书提炼 1-2 个洞察，进入『知行转化』7 天行动计划。"
            )
        return (
            "我是阅读导师，基于《海绵阅读法》帮你高效阅读与内化。"
            "可问我：三层笔记怎么记、如何选书、读完如何输出读书报告。"
        )

    # --- practice -----------------------------------------------------------
    @staticmethod
    def _practice(message: str, ctx: dict) -> str:
        theta = ctx.get("user_theta", 0.3)
        if _has(message, "复习", "间隔", "忘记", "记忆"):
            return (
                "我使用 SM-2 间隔重复算法安排你的复习：答得越好，下次间隔越长；遗忘则重置。\n"
                "每次作答后请用 0-5 自评（0=完全遗忘，5=脱口而出），我会据此调整难度与排程。\n"
                f"你当前的能力估计 θ ≈ {theta:.2f}，我会把新题难度锚定在学习区。"
            )
        if _has(message, "难度", "太简单", "太难", "挑战"):
            return (
                "《刻意练习》的核心是在『舒适区边缘』训练。我通过 IRT 模型让预期成功率维持在 70-85%：\n"
                "- 成功率 > 85%：自动加难。\n"
                "- 成功率 < 70%：自动降难，回到学习区。\n"
                "这同时是心流体验的前提（挑战-技能平衡）。"
            )
        return (
            "我是练习导师，基于《刻意练习》提供自适应难度、即时反馈与技能拆解。"
            "可问我：如何安排复习、为什么题目变难/变简单、如何突破瓶颈。"
        )

    # --- focus --------------------------------------------------------------
    @staticmethod
    def _focus(message: str, ctx: dict) -> str:
        if _has(message, "分心", "专注", "干扰", "走神"):
            return (
                "《深度工作》指出频繁切换会产生『注意力残留』，每次切换损失约 20% 效率。建议：\n"
                "1. 启动深度工作模式，单任务进行。\n"
                "2. 把游离念头记在纸上，而非切换去处理。\n"
                "3. 完成一个番茄钟后再统一处理杂事。\n\n"
                "进入『深度工作』页，我会为你执行启动仪式并屏蔽干扰统计。"
            )
        if _has(message, "策略", "节奏", "时间块", "怎么安排"):
            vocation = ctx.get("vocation")
            from ..engines.deep_work import DeepWorkEngine
            strategy = DeepWorkEngine.recommend_strategy(vocation)
            from ..engines.deep_work import STRATEGIES
            return (
                f"根据你的情况，推荐深度工作策略：{strategy}\n"
                f"{STRATEGIES[strategy]}\n\n"
                "我会在你精力高峰（约 9-11 点、20-22 点）安排深度时间块。"
            )
        return (
            "我是专注导师，基于《深度工作》保护你的专注力。"
            "可问我：如何避免分心、哪种深度工作策略适合我、如何安排时间块。"
        )

    # --- thinking -----------------------------------------------------------
    @staticmethod
    def _thinking(message: str, ctx: dict) -> str:
        if _has(message, "批判", "论证", "谬误", "质疑", "评估"):
            return (
                "《学会提问》给出 11 步批判性思维清单：论题结论 → 理由 → 歧义词 → "
                "价值假设 → 描述假设 → 推理谬误 → 证据质量 → 替代原因 → 统计欺骗 → "
                "遗漏信息 → 合理结论。\n\n"
                "把文本贴进『批判思维工作台』，我会用淘金式思维自动标注结论、理由、"
                "歧义词、逻辑谬误与证据可靠性等级。"
            )
        return (
            "我是思维导师，基于《学会提问》训练你的批判性思维。"
            "可问我：如何识别谬误、如何评估证据、海绵式与淘金式阅读的区别。"
        )

    # --- action -------------------------------------------------------------
    @staticmethod
    def _action(message: str, ctx: dict) -> str:
        gap = ctx.get("gap_ratio")
        if _has(message, "行动", "实践", "做不到", "知行"):
            advice = ""
            if isinstance(gap, (int, float)) and gap >= 0.7:
                advice = f"\n\n⚠️ 检测到你的知行断裂度为 {gap:.0%}（严重）。强烈建议暂停新增收藏，先消化已有知识。"
            return (
                "《知行差距》指出三重枷锁：信息过载、消极过滤、缺少跟进。破解之道：\n"
                "1. 少而精：从一堆收藏中只挑 1-2 个深入。\n"
                "2. 绿灯思维：先想象可行性，再批判分析。\n"
                "3. 间隔跟进：生成 7 天行动计划，每日推进。\n"
                "4. 教授他人：用费曼输出检验真正理解。" + advice
            )
        return (
            "我是行动导师，基于《知行差距》帮你把知识转化为行动。"
            "可问我：如何克服知行差距、什么是绿灯思维、如何生成 7 天行动计划。"
        )
