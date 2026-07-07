"""Worker Agents — 五大专业导师 + 支持Agent"""
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from ..engines import (
    deliberate_practice, sponge_reading, deep_work,
    knowledge_action, critical_thinking,
)
from ..config import REWARD_CONFIG


class BaseWorker:
    """Worker Agent 基类"""
    name = "Base Tutor"
    engine_name = ""

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}
        return {"content": "暂未实现", "suggestions": []}


class ReadingTutor(BaseWorker):
    """阅读导师 — 海绵阅读法引擎"""
    name = "阅读导师"
    engine_name = "sponge_reading"

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}

        # 如果是生成读书报告请求
        if "报告" in message or "总结" in message:
            book_title = context.get("book_title", "")
            if book_title and db and user:
                from ..models import ReadingNote
                notes = db.query(ReadingNote).filter(
                    ReadingNote.user_id == user.id,
                    ReadingNote.book_title == book_title
                ).all()
                note_dicts = [{"layer": n.layer, "content": n.content, "chapter_info": n.chapter_info} for n in notes]
                report = sponge_reading.generate_reading_report(book_title, note_dicts)
                return {
                    "content": self._format_report(report),
                    "suggestions": ["评估我的阅读能力", "诊断阅读阶段"],
                }
            return {
                "content": "请提供书名，我将根据您的三层笔记生成结构化读书报告。您可以在阅读工作台记录笔记后再生成报告。",
                "suggestions": ["为《刻意练习》生成报告"],
            }

        # 评估阅读能力
        if "能力" in message or "评估" in message or "雷达" in message:
            return {
                "content": (
                    "📖 **海绵阅读法 · 七大阅读能力评估**\n\n"
                    "我将从七个维度评估您的阅读能力：\n"
                    "1. 选书能力  2. 速读能力  3. 精读能力\n"
                    "4. 笔记能力  5. 记忆能力  6. 输出能力  7. 复用能力\n\n"
                    "请前往「阅读工作台」查看您的阅读能力雷达图。建议按三层笔记法（碎片层→章节层→全书层）记录笔记，系统将自动评估您的能力。"
                ),
                "suggestions": ["三层笔记怎么写？", "诊断我的阅读阶段"],
            }

        # 默认：介绍海绵阅读法
        return {
            "content": (
                "📖 **海绵阅读法导师**\n\n"
                "我基于《海绵阅读法》的核心方法帮您提升阅读效率：\n\n"
                "**三层笔记结构：**\n"
                "- 📌 碎片层：第一遍快速浏览，摘录关键片段和金句\n"
                "- 📋 章节层：第二遍精读，整理章节逻辑结构\n"
                "- 💎 全书层：第三遍提炼核心观点和行动项\n\n"
                "您可以：\n"
                "1. 在阅读工作台记录三层笔记\n"
                "2. 让我生成结构化读书报告\n"
                "3. 评估七大阅读能力\n"
                "4. 诊断当前阅读阶段"
            ),
            "suggestions": ["记录阅读笔记", "生成读书报告", "评估阅读能力"],
        }

    def _format_report(self, report: dict) -> str:
        lines = [f"📖 **《{report['book_title']}》读书报告**\n"]
        lines.append(f"**摘要：** {report['summary'][:200]}...\n")
        if report["key_concepts"]:
            lines.append(f"**关键概念：** {', '.join(report['key_concepts'][:5])}\n")
        if report["core_insights"]:
            lines.append("**核心洞察：**")
            for ins in report["core_insights"][:3]:
                lines.append(f"  • {ins}")
        if report["action_items"]:
            lines.append("\n**行动建议：**")
            for act in report["action_items"][:3]:
                lines.append(f"  → {act}")
        stats = report["reading_stats"]
        lines.append(f"\n📊 笔记统计：碎片{stats['fragments_count']}条 | 章节{stats['chapter_count']}条 | 全书{stats['book_count']}条")
        return "\n".join(lines)


class PracticeTutor(BaseWorker):
    """练习导师 — 刻意练习引擎"""
    name = "练习导师"
    engine_name = "deliberate_practice"

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}

        if "开始" in message or "练习" in message or "做题" in message:
            domain = "general"
            if "python" in message.lower():
                domain = "python"
            elif "数据" in message or "data" in message.lower():
                domain = "data_science"

            return {
                "content": (
                    f"🎯 **刻意练习导师**\n\n"
                    f"我来为您生成{domain}领域的自适应练习题。\n\n"
                    f"**刻意练习核心原则：**\n"
                    f"- 🎯 舒适区边缘：难度自适应，保持心流\n"
                    f"- ⚡ 即时反馈：每题完成后提供错误根因分析\n"
                    f"- 🌳 技能分解：将大技能拆解为可练习的微技能\n\n"
                    f"请前往「练习中心」开始练习，系统会根据您的表现自动调整难度。"
                ),
                "suggestions": ["查看技能树", "解释自适应难度", "查看我的学习区"],
            }

        if "技能树" in message or "技能" in message:
            tree = deliberate_practice.get_skill_tree("python")
            lines = [f"🌳 **{tree['name']}技能树**\n"]
            for node in tree["nodes"]:
                prereqs = " ← " + ", ".join(pr for pr in node["prerequisites"]) if node["prerequisites"] else ""
                level_emoji = {"beginner": "🟢", "intermediate": "🟡", "advanced": "🟠", "expert": "🔴"}
                lines.append(f"  {level_emoji.get(node['level'], '⚪')} {node['name']} ({node['level']}){prereqs}")
            lines.append("\n建议按前置依赖顺序学习，每完成一个节点解锁后续技能。")
            return {"content": "\n".join(lines), "suggestions": ["开始练习", "查看学习区"]}

        if "学习区" in message or "舒适区" in message:
            return {
                "content": (
                    "🎯 **舒适区边缘理论**\n\n"
                    "刻意练习的核心是在'学习区'训练，而非舒适区或恐慌区：\n\n"
                    "🟢 **舒适区**：太简单，无法成长\n"
                    "🟡 **学习区**：适度挑战，最优成长（目标区域）\n"
                    "🔴 **恐慌区**：太难，产生挫败感\n\n"
                    "系统会根据您的正确率自动调整难度：\n"
                    "- 正确率 > 80%：提升难度\n"
                    "- 正确率 60-80%：适度提升\n"
                    "- 正确率 < 50%：降低难度回到学习区"
                ),
                "suggestions": ["开始练习", "查看技能树"],
            }

        return {
            "content": (
                "🎯 **刻意练习导师**\n\n"
                "我基于 Anders Ericsson 的《刻意练习》帮您高效训练：\n\n"
                "- 🎯 自适应难度练习\n"
                "- ⚡ 即时反馈与错误分析\n"
                "- 🌳 技能树分解\n"
                "- 📊 学习区边界计算\n\n"
                "请告诉我您想练习什么？"
            ),
            "suggestions": ["开始Python练习", "开始通用学习练习", "查看技能树"],
        }


class FocusTutor(BaseWorker):
    """专注导师 — 深度工作引擎"""
    name = "专注导师"
    engine_name = "deep_work"

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}

        if "策略" in message or "推荐" in message:
            strategy = deep_work.get_strategy_recommendation({"role": "student", "flexibility": "medium"})
            lines = [f"🧘 **推荐深度工作策略：{strategy['name']}**\n"]
            lines.append(f"**描述：** {strategy['description']}\n")
            lines.append(f"**原因：** {strategy['why']}\n")
            lines.append(f"**优势：** {strategy['pros']}")
            lines.append(f"**劣势：** {strategy['cons']}\n")
            lines.append("**实施建议：**")
            for tip in strategy["implementation_tips"]:
                lines.append(f"  → {tip}")
            return {"content": "\n".join(lines), "suggestions": ["查看启动仪式", "开始深度工作"]}

        if "仪式" in message or "启动" in message:
            checklist = deep_work.get_ritual_checklist()
            lines = ["🧘 **深度工作启动仪式**\n"]
            for item in checklist:
                lines.append(f"  {item['step']}. {item['action']}")
                lines.append(f"     → {item['purpose']}")
            lines.append("\n完成以上步骤后，您将进入最佳专注状态。")
            return {"content": "\n".join(lines), "suggestions": ["开始深度工作", "推荐策略"]}

        return {
            "content": (
                "🧘 **深度工作导师**\n\n"
                "我基于 Cal Newport 的《深度工作》帮您提升专注力：\n\n"
                "- ⏱️ 番茄钟管理（25分钟专注+5分钟休息）\n"
                "- 📊 精力曲线分析（识别高效时段）\n"
                "- 🛡️ 注意力残留防护\n"
                "- 🎯 四种深度工作策略推荐\n"
                "- 🧘 启动仪式清单\n\n"
                "请前往「深度工作」页面开始，或告诉我您需要什么帮助。"
            ),
            "suggestions": ["推荐深度工作策略", "查看启动仪式", "查看专注统计"],
        }


class CriticalTutor(BaseWorker):
    """思维导师 — 批判性思维引擎"""
    name = "思维导师"
    engine_name = "critical_thinking"

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}

        if "分析" in message or context.get("text_to_analyze"):
            text = context.get("text_to_analyze", message)
            analysis = critical_thinking.analyze_argument(text)
            lines = ["🔍 **批判性思维分析结果**\n"]
            lines.append(f"**模式：** {analysis['mode_desc']}\n")
            lines.append("**11步论证分析：**")
            for step in analysis["steps"][:5]:
                lines.append(f"  {step['step']}. {step['name']}：{step['finding'][:80]}")
            lines.append(f"  ...（共11步）\n")
            if analysis["fallacies"]:
                lines.append(f"**⚠️ 检测到{len(analysis['fallacies'])}处逻辑谬误：**")
                for f in analysis["fallacies"]:
                    lines.append(f"  • {f['name']}：{f['desc']}")
            else:
                lines.append("**✅ 未检测到明显的逻辑谬误**")
            lines.append(f"\n**证据强度：** {analysis['evidence']['level_name']} — {analysis['evidence']['reliability']}")
            lines.append(f"\n**综合评估：** {analysis['overall_assessment']}")
            return {"content": "\n".join(lines), "suggestions": ["查看完整11步分析", "学习谬误类型"]}

        if "谬误" in message:
            from ..engines.critical_thinking import LOGICAL_FALLACIES
            lines = ["🔍 **常见逻辑谬误清单**\n"]
            for f in LOGICAL_FALLACIES:
                lines.append(f"  • **{f['name']}**：{f['desc']}")
                lines.append(f"    例：{f['example']}\n")
            return {"content": "\n".join(lines), "suggestions": ["分析一段文本", "学习批判性提问"]}

        if "提问" in message:
            questions = critical_thinking.get_critical_questions()
            lines = ["🔍 **淘金式思维 · 批判性提问清单**\n"]
            for i, q in enumerate(questions, 1):
                lines.append(f"  {i}. {q['q']}（{q['purpose']}）")
            return {"content": "\n".join(lines), "suggestions": ["分析一段文本", "查看谬误清单"]}

        return {
            "content": (
                "🔍 **批判性思维导师**\n\n"
                "我基于《学会提问》帮您训练批判性思维：\n\n"
                "- 🧽 海绵模式 vs 🪣 淘金模式切换\n"
                "- 📋 11步论证分析清单\n"
                "- ⚠️ 8种常见逻辑谬误检测\n"
                "- 📊 证据强度四级评估\n"
                "- ❓ 批判性提问清单\n\n"
                "您可以提交一段文本让我分析，或学习谬误识别。"
            ),
            "suggestions": ["分析一段文本", "查看谬误清单", "学习批判性提问"],
        }


class ActionTutor(BaseWorker):
    """行动导师 — 知行转化引擎"""
    name = "行动导师"
    engine_name = "knowledge_action"

    def handle(self, message: str, user=None, db: Session = None, context: dict = None) -> dict:
        context = context or {}

        if "费曼" in message:
            topic = context.get("topic", "")
            if topic:
                return {
                    "content": (
                        f"⚔️ **费曼学习法 · {topic}**\n\n"
                        "请用您自己的话解释这个概念，就像教一个完全不懂的人。我会扮演学生提问，帮您发现理解盲区。\n\n"
                        "提示：\n"
                        "- 用通俗的语言，避免术语\n"
                        "- 加入生活中的例子和类比\n"
                        "- 结构化组织（首先、其次、最后）\n\n"
                        "请在「知行转化」页面提交您的解释。"
                    ),
                    "suggestions": ["查看费曼评估标准", "制定行动计划"],
                }
            return {
                "content": (
                    "⚔️ **费曼学习法**\n\n"
                    "费曼学习法的核心：用简单的语言向他人解释一个概念。\n\n"
                    "**四步法：**\n"
                    "1. 选择一个概念\n"
                    "2. 用自己的话向'小孩'解释\n"
                    "3. 找出解释中的漏洞，回补学习\n"
                    "4. 简化语言，使用类比\n\n"
                    "请告诉我您想解释什么概念？"
                ),
                "suggestions": ["解释'刻意练习'", "解释'深度工作'", "查看行动计划"],
            }

        if "行动" in message or "计划" in message:
            return {
                "content": (
                    "⚔️ **知行转化 · 7天行动计划**\n\n"
                    "基于《知行差距》的方法论，我为每个知识点生成7天行动计划：\n\n"
                    "| 天 | 行动 | 方法 |\n"
                    "|---|------|------|\n"
                    "| D1 | 复述核心要点 | 费曼输出 |\n"
                    "| D2 | 首次实践应用 | 实践 |\n"
                    "| D3 | 反思与记录 | 反思日记 |\n"
                    "| D4 | 跨场景迁移 | 迁移应用 |\n"
                    "| D5 | 教授他人 | 费曼输出 |\n"
                    "| D6 | 总结提炼 | 总结 |\n"
                    "| D7 | 习惯养成 | 长期内化 |\n\n"
                    "请在「知行转化」页面创建行动项，系统会自动生成间隔复习提醒。"
                ),
                "suggestions": ["诊断知行差距", "学习绿灯思维"],
            }

        if "差距" in message or "诊断" in message:
            return {
                "content": (
                    "⚔️ **知行差距诊断**\n\n"
                    "知行转化的三重枷锁：\n\n"
                    "1. **信息过载** — 收藏太多但实践太少\n"
                    "2. **消极过滤** — 还没尝试就否定新知识\n"
                    "3. **缺乏跟进** — 学完即忘，没有复习机制\n\n"
                    "请在「知行转化」页面查看您的知行差距诊断报告。"
                ),
                "suggestions": ["制定行动计划", "学习绿灯思维"],
            }

        return {
            "content": (
                "⚔️ **知行转化导师**\n\n"
                "我基于《知行差距》帮您将知识转化为行动：\n\n"
                "- 📊 知行差距诊断\n"
                "- 📋 7天行动计划 + 间隔复习\n"
                "- 💡 绿灯思维评估\n"
                "- 🎓 费曼学习法输出\n\n"
                "请告诉我您需要什么帮助？"
            ),
            "suggestions": ["制定行动计划", "费曼学习法", "诊断知行差距"],
        }


class ProgressTracker:
    """进度追踪者 Agent"""
    name = "进度追踪者"

    def generate_brief_report(self, user, db: Session) -> dict:
        """生成简要进度报告"""
        from ..models import LearningSession, FocusSession, KnowledgeNode, LearningPlan

        total_sessions = db.query(LearningSession).filter(LearningSession.user_id == user.id).count()
        total_focus = db.query(FocusSession).filter(FocusSession.user_id == user.id, FocusSession.completed == True).count()
        total_nodes = db.query(KnowledgeNode).filter(KnowledgeNode.user_id == user.id).count()
        active_plans = db.query(LearningPlan).filter(LearningPlan.user_id == user.id, LearningPlan.status == "active").count()

        from ..auth import get_user_level
        level = get_user_level(user.total_points)

        return {
            "content": (
                f"📊 **学习进度报告**\n\n"
                f"**等级：** {level['icon']} {level['name']} | **积分：** {user.total_points} | **连续学习：** {user.streak_days}天\n\n"
                f"**学习数据：**\n"
                f"- 📚 学习会话：{total_sessions} 次\n"
                f"- 🧘 深度工作：{total_focus} 次\n"
                f"- 🧠 知识节点：{total_nodes} 个\n"
                f"- 📋 活跃计划：{active_plans} 个\n\n"
                f"{'🔥 保持势头，继续努力！' if user.streak_days >= 3 else '💡 建议每天保持学习，建立连续习惯！'}"
            ),
            "suggestions": ["开始学习", "查看详细分析", "制定新计划"],
        }


class RewardOfficer:
    """激励官 Agent —— 跨学科奖励发放"""
    name = "激励官"

    @staticmethod
    def calculate_reward(action: str, context: dict = None) -> dict:
        """计算奖励 —— 跨学科融合"""
        context = context or {}
        base_points = REWARD_CONFIG.get(action, 0)

        # 心理学：变动比率惊喜奖励
        import random
        surprise_bonus = 0
        surprise_message = ""
        if random.random() < 0.15:  # 15%概率触发惊喜
            surprise_bonus = random.randint(5, 20)
            surprises = [
                f"🎁 惊喜奖励！额外获得 {surprise_bonus} 积分",
                f"✨ 运气加成！+{surprise_bonus} 积分",
                f"🌟 心流奖励！+{surprise_bonus} 积分",
            ]
            surprise_message = random.choice(surprises)

        # 社会学：连续学习加成
        streak_bonus = 0
        streak = context.get("streak_days", 0)
        if streak >= 7:
            streak_bonus = min(20, streak)
            streak_msg = f"🔥 连续学习{streak}天，额外奖励 +{streak_bonus}"
        else:
            streak_msg = ""

        # 金融学：ROI量化
        total = base_points + surprise_bonus + streak_bonus

        return {
            "base_points": base_points,
            "surprise_bonus": surprise_bonus,
            "surprise_message": surprise_message,
            "streak_bonus": streak_bonus,
            "streak_message": streak_msg,
            "total_points": total,
            "action": action,
        }
