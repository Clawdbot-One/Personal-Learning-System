"""引擎三：专注力保护与深度工作引擎
源自 Cal Newport《深度工作》—— 深度/浅层区分、注意力残留防护、四种策略、仪式感与时间块
"""
from collections import defaultdict
from datetime import datetime, timezone


# 四种深度工作策略
DEEP_WORK_STRATEGIES = {
    "monastic": {
        "name": "禁欲者策略",
        "desc": "彻底屏蔽浅层工作，长时间专注于单一深度目标",
        "suitable": "科研人员、作家、需要长期专注单一项目的专业人士",
        "pros": "深度最大化", "cons": "不适合需要多任务协作的场景",
    },
    "bimodal": {
        "name": "双峰策略",
        "desc": "将时间分为深度期和开放期，如一周中3-4天深度工作，其余处理日常",
        "suitable": "学者、创业者、可以灵活安排时间的人",
        "pros": "兼顾深度与日常", "cons": "需要较大块的时间灵活性",
    },
    "rhythmic": {
        "name": "节奏策略",
        "desc": "每天固定时段进行深度工作，形成习惯节律（如每天早晨9-11点）",
        "suitable": "上班族、学生、大多数职场人士",
        "pros": "最易坚持，无需意志力", "cons": "需要稳定的生活作息",
    },
    "journalistic": {
        "name": "新闻记者策略",
        "desc": "在任何有空闲的时间段快速切换到深度工作模式",
        "suitable": "忙碌的高管、记者、时间碎片化的专业人士",
        "pros": "充分利用碎片时间", "cons": "进入深度状态难度大，需要训练",
    },
}

# 番茄钟配置
POMODORO_CONFIG = {
    "focus_minutes": 25,
    "short_break": 5,
    "long_break": 15,
    "cycles_before_long_break": 4,
}


def get_strategy_recommendation(user_profile: dict) -> dict:
    """根据用户特征推荐深度工作策略"""
    role = user_profile.get("role", "student")
    schedule_flexibility = user_profile.get("flexibility", "medium")  # low/medium/high

    if role in ["researcher", "writer"] or schedule_flexibility == "high":
        strategy = "monastic"
    elif role in ["entrepreneur", "freelancer"]:
        strategy = "bimodal"
    elif role in ["executive", "journalist"] or schedule_flexibility == "low":
        strategy = "journalistic"
    else:
        strategy = "rhythmic"

    recommendation = DEEP_WORK_STRATEGIES[strategy]
    return {
        "strategy": strategy,
        "name": recommendation["name"],
        "description": recommendation["desc"],
        "why": f"根据您的角色({role})和时间灵活度({schedule_flexibility})，{recommendation['name']}最适合您",
        "pros": recommendation["pros"],
        "cons": recommendation["cons"],
        "implementation_tips": _get_implementation_tips(strategy),
    }


def _get_implementation_tips(strategy: str) -> list[str]:
    tips = {
        "monastic": [
            "设定明确的深度工作周期（如1-3个月）",
            "提前处理所有必要的浅层事务",
            "建立免打扰的工作环境",
            "告知相关人员您的不可用时段",
        ],
        "bimodal": [
            "划定每周的深度工作日（如周二、周三、周四）",
            "深度日不安排会议和日常事务",
            "开放日集中处理沟通和协作",
            "确保深度日至少有4小时不受打扰",
        ],
        "rhythmic": [
            "固定每天同一时段进行深度工作（建议早晨）",
            "使用日历锁定深度工作时段",
            "建立启动仪式（清理桌面、戴上耳机、开启番茄钟）",
            "连续坚持21天形成节律习惯",
        ],
        "journalistic": [
            "训练快速进入专注状态的能力",
            "随时记录可利用的时间窗口",
            "准备'随时开始'的工作清单",
            "从15分钟的小段开始训练",
        ],
    }
    return tips.get(strategy, tips["rhythmic"])


def analyze_focus_stats(focus_sessions: list[dict]) -> dict:
    """专注统计分析"""
    if not focus_sessions:
        return {
            "total_sessions": 0,
            "total_minutes": 0,
            "avg_focus_quality": 0,
            "deep_work_ratio": 0,
            "energy_curve": [],
            "best_time_slot": "",
            "recommendation": "开始您的第一次深度工作会话吧！",
        }

    total_minutes = sum(s.get("actual_minutes", 0) for s in focus_sessions)
    deep_sessions = [s for s in focus_sessions if s.get("work_type") == "deep"]
    deep_minutes = sum(s.get("actual_minutes", 0) for s in deep_sessions)

    # 计算专注质量（实际时间/计划时间 - 干扰惩罚）
    qualities = []
    for s in focus_sessions:
        planned = max(1, s.get("planned_minutes", 25))
        actual = s.get("actual_minutes", 0)
        distractions = s.get("distraction_count", 0)
        quality = min(1.0, actual / planned) * max(0.3, 1 - distractions * 0.1)
        qualities.append(quality)
    avg_quality = sum(qualities) / len(qualities) if qualities else 0

    # 精力曲线分析（按时段统计）
    hour_stats = defaultdict(lambda: {"minutes": 0, "count": 0, "quality_sum": 0})
    for s in focus_sessions:
        started = s.get("started_at")
        if isinstance(started, str):
            try:
                started = datetime.fromisoformat(started.replace("Z", "+00:00"))
            except Exception:
                continue
        if isinstance(started, datetime):
            hour = started.hour
            hour_stats[hour]["minutes"] += s.get("actual_minutes", 0)
            hour_stats[hour]["count"] += 1
            planned = max(1, s.get("planned_minutes", 25))
            actual = s.get("actual_minutes", 0)
            distractions = s.get("distraction_count", 0)
            quality = min(1.0, actual / planned) * max(0.3, 1 - distractions * 0.1)
            hour_stats[hour]["quality_sum"] += quality

    energy_curve = []
    for hour in sorted(hour_stats.keys()):
        stats = hour_stats[hour]
        avg_q = stats["quality_sum"] / stats["count"] if stats["count"] > 0 else 0
        energy_curve.append({
            "hour": f"{hour:02d}:00",
            "minutes": stats["minutes"],
            "quality": round(avg_q, 2),
        })

    # 找出最佳时段
    best_hour = ""
    if energy_curve:
        best = max(energy_curve, key=lambda x: x["quality"])
        best_hour = best["hour"]

    deep_ratio = deep_minutes / total_minutes if total_minutes > 0 else 0

    # 生成建议
    if avg_quality > 0.8:
        recommendation = "专注质量优秀！继续保持当前节奏，可以适当增加深度工作时间。"
    elif avg_quality > 0.5:
        recommendation = "专注质量良好。建议减少干扰，尝试在最佳时段安排最重要的深度工作。"
    else:
        recommendation = "专注质量有待提升。建议从短时间（15分钟）开始训练专注力，逐步延长。"

    return {
        "total_sessions": len(focus_sessions),
        "total_minutes": total_minutes,
        "deep_work_ratio": round(deep_ratio, 2),
        "avg_focus_quality": round(avg_quality, 2),
        "energy_curve": energy_curve,
        "best_time_slot": best_hour,
        "recommendation": recommendation,
    }


def get_ritual_checklist() -> list[dict]:
    """深度工作启动仪式清单 —— 仪式感设计"""
    return [
        {"step": 1, "action": "清理桌面，移除所有无关物品", "purpose": "减少视觉干扰"},
        {"step": 2, "action": "关闭手机通知，开启勿扰模式", "purpose": "阻断外部干扰"},
        {"step": 3, "action": "明确本次深度工作的具体目标", "purpose": "聚焦单一任务"},
        {"step": 4, "action": "启动番茄钟（25分钟专注周期）", "purpose": "时间约束创造紧迫感"},
        {"step": 5, "action": "戴上耳机，播放白噪音或纯音乐", "purpose": "建立环境仪式感"},
        {"step": 6, "action": "深呼吸三次，正式开始", "purpose": "心理切换到深度模式"},
    ]


def check_attention_residue(switch_count: int) -> dict:
    """注意力残留检测 —— 防护系统"""
    if switch_count <= 2:
        level = "healthy"
        advice = "注意力切换频率健康，继续保持。"
    elif switch_count <= 5:
        level = "warning"
        advice = "切换较频繁，存在注意力残留风险。建议完成当前任务再切换。"
    else:
        level = "danger"
        advice = "切换过于频繁！注意力严重碎片化。建议立即停止切换，专注完成一个任务至少15分钟。"

    return {
        "switch_count": switch_count,
        "level": level,
        "advice": advice,
        "residue_risk": min(1.0, switch_count * 0.15),
    }
