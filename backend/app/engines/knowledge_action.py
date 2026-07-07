"""引擎四：知识-行动转化引擎
源自 Ken Blanchard《知行差距》—— 精要筛选、绿灯思维、间隔重复跟进、教授他人内化
"""
import re
from datetime import datetime, timedelta, timezone


# 知行差距三重枷锁
KNOWING_DOING_GAPS = {
    "info_overload": {
        "name": "信息过载",
        "desc": "收藏太多但实践太少，知识停留在'知道'层面",
        "symptom": "收藏夹/笔记本越来越厚，但行动清单空空如也",
        "cure": "执行'少而精'原则：每次只聚焦1-2个可行动的知识点",
    },
    "negative_filter": {
        "name": "消极过滤",
        "desc": "对新知识持批判态度，还没尝试就否定",
        "symptom": "频繁说'这不适合我'、'我做不到'、'道理我都懂'",
        "cure": "运用'绿灯思维'：先发掘可行性，再进行批判分析",
    },
    "lack_followup": {
        "name": "缺乏跟进",
        "desc": "学完即忘，没有系统的复习和行动计划",
        "symptom": "学完就放下，一周后忘记80%内容",
        "cure": "建立7天行动计划 + 间隔复习机制",
    },
}


def diagnose_knowing_doing_gap(collected_count: int, practiced_count: int, review_count: int) -> dict:
    """知行差距诊断"""
    practice_ratio = practiced_count / max(1, collected_count)
    review_ratio = review_count / max(1, collected_count)

    gaps = []
    if practice_ratio < 0.3:
        gaps.append({
            **KNOWING_DOING_GAPS["info_overload"],
            "severity": "high" if practice_ratio < 0.1 else "medium",
            "metric": f"实践率 {practice_ratio:.0%}（收藏{collected_count}，实践{practiced_count}）",
        })
    if review_ratio < 0.2:
        gaps.append({
            **KNOWING_DOING_GAPS["lack_followup"],
            "severity": "high" if review_ratio < 0.05 else "medium",
            "metric": f"复习率 {review_ratio:.0%}（收藏{collected_count}，复习{review_count}）",
        })

    if not gaps:
        gaps.append({
            "name": "状态良好",
            "desc": "知行转化率健康，继续保持",
            "cure": "维持当前的实践和复习节奏",
            "severity": "none",
            "metric": f"实践率 {practice_ratio:.0%}，复习率 {review_ratio:.0%}",
        })

    overall_score = (practice_ratio * 0.6 + review_ratio * 0.4) * 100

    return {
        "overall_score": round(overall_score, 1),
        "practice_ratio": round(practice_ratio, 2),
        "review_ratio": round(review_ratio, 2),
        "gaps": gaps,
        "recommendation": _gap_recommendation(overall_score),
    }


def generate_action_plan(knowledge_concept: str, description: str = "") -> list[dict]:
    """生成7天行动计划 —— 间隔重复跟进"""
    now = datetime.now(timezone.utc)
    plan = [
        {
            "day": 1,
            "date": (now + timedelta(days=0)).strftime("%Y-%m-%d"),
            "action": f"明确'{knowledge_concept}'的核心要点，用自己的话复述一遍",
            "method": "费曼输出",
            "duration": "15分钟",
            "purpose": "建立初步理解",
        },
        {
            "day": 2,
            "date": (now + timedelta(days=1)).strftime("%Y-%m-%d"),
            "action": f"在实际行动中尝试应用'{knowledge_concept}'一次",
            "method": "实践应用",
            "duration": "30分钟",
            "purpose": "从理论到实践的第一次跨越",
        },
        {
            "day": 3,
            "date": (now + timedelta(days=2)).strftime("%Y-%m-%d"),
            "action": f"回顾昨天的实践，记录遇到的问题和心得",
            "method": "反思日记",
            "duration": "15分钟",
            "purpose": "间隔复习 + 深度反思",
        },
        {
            "day": 4,
            "date": (now + timedelta(days=3)).strftime("%Y-%m-%d"),
            "action": f"寻找'{knowledge_concept}'在不同场景下的应用机会，尝试2-3种变体",
            "method": "迁移应用",
            "duration": "30分钟",
            "purpose": "跨场景迁移，加深理解",
        },
        {
            "day": 5,
            "date": (now + timedelta(days=4)).strftime("%Y-%m-%d"),
            "action": f"向他人（或Agent）讲解'{knowledge_concept}'，回答提问",
            "method": "费曼输出",
            "duration": "20分钟",
            "purpose": "教授他人，检验理解深度",
        },
        {
            "day": 6,
            "date": (now + timedelta(days=5)).strftime("%Y-%m-%d"),
            "action": f"复盘本周实践，总结'{knowledge_concept}'的最佳应用方式",
            "method": "总结提炼",
            "duration": "20分钟",
            "purpose": "形成个人方法论",
        },
        {
            "day": 7,
            "date": (now + timedelta(days=6)).strftime("%Y-%m-%d"),
            "action": f"制定后续持续应用计划，将'{knowledge_concept}'融入日常习惯",
            "method": "习惯养成",
            "duration": "15分钟",
            "purpose": "长期内化",
        },
    ]
    return plan


def generate_review_dates() -> list[str]:
    """生成间隔复习日期（基于艾宾浩斯曲线）"""
    now = datetime.now(timezone.utc)
    intervals = [1, 2, 4, 7, 15, 30]  # 天
    return [(now + timedelta(days=d)).strftime("%Y-%m-%d") for d in intervals]


def green_light_thinking(idea: str) -> dict:
    """绿灯思维评估 —— 先发掘潜力再批判"""
    # 第一步：绿灯（发掘潜力）
    green_light = [
        f"这个想法'{idea}'有哪些潜在价值？",
        "在什么条件下这个想法可以成功？",
        "这个想法中哪些部分是可行的？",
        "如何将这个想法的精华应用到实际中？",
    ]

    # 第二步：红灯（批判分析）
    red_light = [
        "这个想法有哪些潜在风险？",
        "实施这个想法需要什么资源？",
        "有没有更好的替代方案？",
        "如何验证这个想法是否有效？",
    ]

    return {
        "idea": idea,
        "green_light_questions": green_light,
        "red_light_questions": red_light,
        "process": "先绿灯（发掘潜力）→ 再红灯（批判分析）→ 最后黄灯（综合决策）",
        "principle": "绿灯思维要求我们先积极寻找新想法的价值，而不是立即否定。这能克服'消极过滤'的知行差距。",
    }


def feynman_evaluate(topic: str, explanation: str) -> dict:
    """费曼学习法评估 —— Agent扮演学生提问"""
    # 分析解释质量
    word_count = len(explanation)
    has_examples = any(kw in explanation for kw in ["例如", "比如", "举例", "就像", "相当于"])
    has_analogy = any(kw in explanation for kw in ["类似", "好比", "想象", "相当于", "就像"])
    has_structure = any(kw in explanation for kw in ["首先", "其次", "然后", "最后", "第一", "第二"])
    is_simple = word_count > 0 and not any(kw in explanation for kw in ["众所周知", "不言而喻", "显然"])

    # 质量评分
    scores = {
        "完整性": min(100, word_count / 3),
        "通俗性": 80 if is_simple else 40,
        "有举例": 85 if has_examples else 30,
        "有类比": 80 if has_analogy else 35,
        "有结构": 75 if has_structure else 40,
    }
    avg_score = sum(scores.values()) / len(scores)

    # 生成追问（扮演学生）
    questions = _generate_feynman_questions(topic, explanation, has_examples, has_analogy)

    # 识别盲区
    blind_spots = []
    if not has_examples:
        blind_spots.append("缺少具体例子，听众难以将抽象概念落地")
    if not has_analogy:
        blind_spots.append("缺少类比，对新手的理解门槛较高")
    if word_count < 50:
        blind_spots.append("解释过于简短，可能遗漏了重要细节")
    if not has_structure:
        blind_spots.append("缺少结构化组织，逻辑层次不够清晰")

    return {
        "topic": topic,
        "scores": [{"dimension": k, "score": round(v)} for k, v in scores.items()],
        "overall_score": round(avg_score),
        "student_questions": questions,
        "blind_spots": blind_spots,
        "feedback": _feynman_feedback(avg_score),
    }


def _gap_recommendation(score: float) -> str:
    if score >= 70:
        return "知行转化能力优秀！继续保持实践和复习的节奏。"
    elif score >= 40:
        return "知行转化能力中等。建议增加实践频率，每次学习后立即制定行动计划。"
    else:
        return "知行差距较大。建议：1) 减少收藏量，聚焦少而精；2) 每个知识点制定7天行动计划；3) 使用间隔复习巩固记忆。"


def _generate_feynman_questions(topic: str, explanation: str, has_examples: bool, has_analogy: bool) -> list[str]:
    questions = [
        f"你能用更简单的话解释'{topic}'吗？我不是很理解。",
        f"'{topic}'和我们日常生活中的什么事情类似？",
        f"如果我要向一个完全不懂的人解释'{topic}'，最关键的一点是什么？",
    ]
    if not has_examples:
        questions.append(f"能举一个具体的例子来说明'{topic}'吗？")
    if not has_analogy:
        questions.append(f"'{topic}'和什么已有概念相似？能用类比说明吗？")
    questions.append(f"'{topic}'有什么常见的误解或陷阱？")
    questions.append(f"如果我只能记住'{topic}'的一句话，那应该是什么？")
    return questions


def _feynman_feedback(score: float) -> str:
    if score >= 75:
        return "解释质量优秀！概念理解到位，能通俗地传达给他人。建议继续深化，尝试更复杂的主题。"
    elif score >= 50:
        return "解释质量良好，但还有提升空间。建议增加具体例子和类比，让解释更加通俗易懂。"
    else:
        return "解释需要改进。建议：1) 用更简单的语言；2) 加入生活化的例子和类比；3) 结构化组织内容；4) 确保覆盖核心要点。"
