"""Manager Agent — 学习规划师，意图识别与任务编排"""
import re
from typing import Optional

from .workers import (
    ReadingTutor, PracticeTutor, FocusTutor, CriticalTutor, ActionTutor,
    ProgressTracker, RewardOfficer,
)


# 意图分类关键词
INTENT_KEYWORDS = {
    "reading": ["阅读", "读书", "笔记", "书", " sponge", "海绵", "精读", "速读", "读后感", "书评"],
    "practice": ["练习", "做题", "题目", "考试", "测验", "刷题", "刻意练习", "技能", "难度"],
    "focus": ["专注", "深度工作", "番茄", "番茄钟", "集中", "分心", "干扰", "心流", "时间管理"],
    "critical": ["批判", "论证", "谬误", "逻辑", "质疑", "提问", "证据", "推理", "分析"],
    "action": ["行动", "实践", "知行", "费曼", "计划", "复习", "跟进", "应用", "落实"],
    "plan": ["计划", "目标", "规划", "安排", "学习路线", "里程碑"],
    "status": ["进度", "统计", "报告", "怎么样", "数据", "分析", "dashboard", "概览"],
    "greeting": ["你好", "hi", "hello", "在吗", "帮我", "帮助"],
}


class ManagerAgent:
    """Manager Agent — 学习规划师"""

    def __init__(self):
        self.workers = {
            "reading": ReadingTutor(),
            "practice": PracticeTutor(),
            "focus": FocusTutor(),
            "critical": CriticalTutor(),
            "action": ActionTutor(),
        }
        self.tracker = ProgressTracker()
        self.rewarder = RewardOfficer()

    def classify_intent(self, message: str) -> str:
        """意图识别"""
        message_lower = message.lower()
        scores = {}
        for intent, keywords in INTENT_KEYWORDS.items():
            score = sum(1 for kw in keywords if kw in message_lower)
            if score > 0:
                scores[intent] = score

        if not scores:
            return "general"

        return max(scores, key=scores.get)

    def handle_message(self, message: str, user=None, db=None, context: dict = None) -> dict:
        """处理用户消息 —— Manager编排"""
        context = context or {}
        intent = self.classify_intent(message)

        # 根据意图派发到对应Worker
        if intent in self.workers:
            worker = self.workers[intent]
            response = worker.handle(message, user, db, context)
            response["agent_type"] = intent + "_tutor"
            response["intent"] = intent
        elif intent == "plan":
            response = self._handle_plan(message, user, db, context)
            response["agent_type"] = "manager"
        elif intent == "status":
            response = self.tracker.generate_brief_report(user, db)
            response["agent_type"] = "tracker"
        elif intent == "greeting":
            response = self._handle_greeting(user)
            response["agent_type"] = "manager"
        else:
            response = self._handle_general(message, user, db)
            response["agent_type"] = "manager"

        # Manager整合：添加通用建议
        response["intent"] = response.get("intent", intent)
        return response

    def _handle_plan(self, message: str, user, db, context: dict) -> dict:
        """处理学习计划相关请求"""
        return {
            "content": (
                "我是您的学习规划师。关于学习计划，我可以帮您：\n\n"
                "1. **制定学习计划** — 告诉我您想学什么，我来规划里程碑\n"
                "2. **分解技能树** — 将大目标拆解为可执行的子技能\n"
                "3. **安排学习节奏** — 基于深度工作策略推荐最佳时间安排\n"
                "4. **追踪进度** — 监控里程碑完成情况并动态调整\n\n"
                "您可以前往「学习计划」页面创建新计划，或告诉我您的学习目标，我来帮您规划。"
            ),
            "suggestions": ["我想学Python数据分析", "帮我规划一个30天学习计划", "推荐深度工作策略"],
        }

    def _handle_greeting(self, user) -> dict:
        name = user.username if user else "学习者"
        return {
            "content": (
                f"您好，{name}！我是 LearnFlow AI 学习导师。我融合了五大学习方法论：\n\n"
                "📖 **海绵阅读法** — 三层笔记，高效阅读\n"
                "🎯 **刻意练习** — 自适应难度，舒适区边缘训练\n"
                "🧘 **深度工作** — 专注力保护，番茄钟管理\n"
                "⚔️ **知行转化** — 行动计划，费曼输出\n"
                "🔍 **学会提问** — 批判性思维，谬误检测\n\n"
                "请问您今天想做什么？"
            ),
            "suggestions": ["开始一次刻意练习", "帮我分析一段论证", "制定阅读计划", "查看学习进度"],
        }

    def _handle_general(self, message: str, user, db) -> dict:
        """处理通用消息"""
        return {
            "content": (
                "我理解您的需求。作为您的学习导师，我可以在以下方面帮助您：\n\n"
                "- 📖 阅读指导（三层笔记法、读书报告）\n"
                "- 🎯 刻意练习（自适应题目、即时反馈）\n"
                "- 🧘 深度工作（番茄钟、专注策略）\n"
                "- ⚔️ 知行转化（行动计划、费曼输出）\n"
                "- 🔍 批判思维（论证分析、谬误检测）\n\n"
                "请告诉我您具体想做什么，或选择下方的建议。"
            ),
            "suggestions": ["开始练习", "记录阅读笔记", "启动深度工作", "分析一段文本"],
        }


# 全局Manager实例
manager_agent = ManagerAgent()
