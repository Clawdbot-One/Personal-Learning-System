"""引擎五：批判性思维训练引擎
源自 M. Neil Browne《学会提问》—— 海绵vs淘金思维、11步批判性思维清单、谬误识别、证据分级
"""
import re


# 11步批判性思维清单
CRITICAL_STEPS = [
    {"step": 1, "name": "识别结论", "desc": "作者/说话者想要我们接受的核心主张是什么？", "question": "主要结论是什么？"},
    {"step": 2, "name": "识别理由", "desc": "支撑结论的理由和论据有哪些？", "question": "支撑结论的理由是什么？"},
    {"step": 3, "name": "识别歧义词", "desc": "哪些关键词的含义模糊或多义？", "question": "哪些词句有歧义？"},
    {"step": 4, "name": "发现价值观假设", "desc": "作者持有怎样的价值观偏好？", "question": "作者的价值取向是什么？"},
    {"step": 5, "name": "发现描述性假设", "desc": "论证中隐含了哪些关于世界如何运行的假设？", "question": "有哪些未明说的假设？"},
    {"step": 6, "name": "检查推理谬误", "desc": "推理过程中是否存在逻辑谬误？", "question": "推理是否包含谬误？"},
    {"step": 7, "name": "评估证据强度", "desc": "提供的证据有多大的可信度？", "question": "证据有多强？"},
    {"step": 8, "name": "寻找替代原因", "desc": "是否有其他可能的原因能解释同一结果？", "question": "有无替代原因？"},
    {"step": 9, "name": "评估数据可靠性", "desc": "数据是否具有欺骗性？来源是否可靠？", "question": "数据可靠吗？"},
    {"step": 10, "name": "识别省略信息", "desc": "哪些重要的反面信息被忽略了？", "question": "遗漏了什么信息？"},
    {"step": 11, "name": "得出合理结论", "desc": "基于以上分析，最合理的结论是什么？", "question": "最合理的结论是什么？"},
]

# 常见逻辑谬误
LOGICAL_FALLACIES = [
    {
        "name": "人身攻击",
        "pattern": r"(因为|毕竟).*(他|她|他们|你).*(是|曾经|总是).*(坏人|蠢|不可信|骗子|不靠谱)",
        "desc": "攻击提出观点的人，而非观点本身",
        "example": "他的建议不可信，因为他连大学都没考上。",
    },
    {
        "name": "滑坡谬误",
        "pattern": r"如果.*就.*会.*最终.*导致",
        "desc": "假设一件事会导致一系列灾难性后果，但没有充分证据",
        "example": "如果你今天不学习，明天就会堕落，最终一事无成。",
    },
    {
        "name": "稻草人谬误",
        "pattern": r"(所以你的意思是|也就是说).*(极端|绝对|完全)",
        "desc": "歪曲对方观点然后攻击歪曲后的版本",
        "example": "所以你的意思是完全不需要学习？这太荒谬了。",
    },
    {
        "name": "诉诸权威",
        "pattern": r"(专家|教授|名人|权威).*(说|认为|表示).*(所以|因此)",
        "desc": "仅因为权威人士说了就认为是正确的",
        "example": "某院士说这个方法有效，所以一定是有效的。",
    },
    {
        "name": "诉诸大众",
        "pattern": r"(大家都|所有人都|多数人|很多人).*(认为|觉得|相信|在做)",
        "desc": "因为很多人相信所以认为是对的",
        "example": "大家都这么学，所以这个方法一定是对的。",
    },
    {
        "name": "虚假两难",
        "pattern": r"(要么.*要么|不是.*就是|只有.*才)",
        "desc": "只给出两个极端选择，忽略其他可能性",
        "example": "你要么拼命学习，要么一辈子平庸。",
    },
    {
        "name": "循环论证",
        "pattern": r".*因为.*所以.*因为",
        "desc": "用结论本身作为理由来证明结论",
        "example": "这个方法有效，因为它确实起作用了。",
    },
    {
        "name": "因果混淆",
        "pattern": r"(相关性|同时发生|伴随).*(导致|引起|造成)",
        "desc": "将相关性误认为因果关系",
        "example": "早起的人成绩好，所以早起导致成绩好。",
    },
]

# 证据强度分级
EVIDENCE_LEVELS = [
    {"level": 1, "name": "系统观察", "desc": "受控实验、随机对照试验等金标准证据", "reliability": "高"},
    {"level": 2, "name": "案例研究", "desc": "深入分析个别案例，有参考价值但推广性有限", "reliability": "中"},
    {"level": 3, "name": "专家意见", "desc": "领域专家的判断，取决于专家资质和共识程度", "reliability": "中"},
    {"level": 4, "name": "个人经验", "desc": "个人直觉和经验，主观性强，可靠性最低", "reliability": "低"},
]


def analyze_argument(text: str, mode: str = "panning") -> dict:
    """11步论证分析 —— 批判性思维清单"""
    analysis = {
        "mode": mode,
        "mode_desc": _get_mode_description(mode),
        "steps": [],
        "fallacies": detect_fallacies(text),
        "evidence": evaluate_evidence(text),
        "overall_assessment": "",
    }

    for step_def in CRITICAL_STEPS:
        finding = _analyze_step(text, step_def["step"])
        analysis["steps"].append({
            **step_def,
            "finding": finding,
        })

    # 综合评估
    fallacy_count = len(analysis["fallacies"])
    evidence_quality = analysis["evidence"]["overall_level"]
    if fallacy_count == 0 and evidence_quality <= 2:
        assessment = "论证较为严谨，证据支撑充分。仍建议关注是否有遗漏的重要信息。"
    elif fallacy_count <= 1:
        assessment = f"论证基本合理，但发现{fallacy_count}处潜在谬误。建议进一步审视推理过程。"
    else:
        assessment = f"论证存在{fallacy_count}处逻辑谬误，证据强度为'{EVIDENCE_LEVELS[evidence_quality-1]['name']}'级。建议审慎对待该论证的结论。"

    analysis["overall_assessment"] = assessment
    return analysis


def detect_fallacies(text: str) -> list[dict]:
    """逻辑谬误检测"""
    detected = []
    for fallacy in LOGICAL_FALLACIES:
        if re.search(fallacy["pattern"], text, re.IGNORECASE):
            detected.append({
                "name": fallacy["name"],
                "desc": fallacy["desc"],
                "example": fallacy["example"],
                "suggestion": f"建议重新审视论证，避免'{fallacy['name']}'的影响。聚焦于证据本身而非论证技巧。",
            })
    return detected


def evaluate_evidence(text: str) -> dict:
    """证据可靠性评估"""
    evidence_indicators = {
        1: [r"实验", r"研究.*表明", r"随机.*对照", r"统计.*显著", r"样本.*量"],
        2: [r"案例", r"实例", r"个案"],
        3: [r"专家.*认为", r"教授.*说", r"学者.*指出", r"权威"],
        4: [r"我觉得", r"我认为", r"个人.*经验", r"我.*感觉", r"直觉"],
    }

    best_level = 4  # 默认最低
    found_indicators = []
    for level, patterns in evidence_indicators.items():
        for pattern in patterns:
            if re.search(pattern, text, re.IGNORECASE):
                if level < best_level:
                    best_level = level
                found_indicators.append({"level": level, "pattern": pattern})

    level_info = EVIDENCE_LEVELS[best_level - 1]
    return {
        "overall_level": best_level,
        "level_name": level_info["name"],
        "reliability": level_info["desc"],
        "indicators_found": found_indicators,
        "improvement": _evidence_improvement(best_level),
    }


def get_critical_questions(topic: str = "") -> list[dict]:
    """获取批判性提问清单 —— 淘金式思维"""
    return [
        {"q": "论题和结论是什么？", "purpose": "明确讨论对象"},
        {"q": "理由是什么？", "purpose": "找出支撑结论的依据"},
        {"q": "哪些词句有歧义？", "purpose": "澄清关键概念"},
        {"q": "什么是价值观假设和描述性假设？", "purpose": "揭示隐藏前提"},
        {"q": "推理中是否存在谬误？", "purpose": "检验逻辑有效性"},
        {"q": "证据的可信度有多高？", "purpose": "评估论据质量"},
        {"q": "是否存在替代原因？", "purpose": "排除他因"},
        {"q": "数据是否具有欺骗性？", "purpose": "核实数据可靠性"},
        {"q": "有哪些重要信息被省略了？", "purpose": "补充完整图景"},
        {"q": "能得出哪些合理的结论？", "purpose": "形成独立判断"},
    ]


def _get_mode_description(mode: str) -> str:
    if mode == "sponging":
        return "海绵模式：被动吸收信息，获取尽可能多的知识。适合初步了解领域。"
    else:
        return "淘金模式：主动提问和批判，筛选信息的可靠性。适合深度学习和决策。"


def _analyze_step(text: str, step: int) -> str:
    """分析特定步骤的发现（简化版）"""
    findings = {
        1: _find_conclusion(text),
        2: _find_reasons(text),
        3: _find_ambiguity(text),
        4: "需结合上下文分析作者的价值观偏好（如效率优先vs公平优先）",
        5: "需识别论证中隐含的关于因果关系的假设",
        6: f"已检测到{len(detect_fallacies(text))}处潜在谬误（详见谬误检测）",
        7: f"证据强度评估为{evaluate_evidence(text)['level_name']}",
        8: "需考虑是否有其他原因可以解释相同的结果",
        9: "需核实数据的来源、样本量和统计方法",
        10: "需关注作者可能选择性呈现的有利信息",
        11: "综合以上分析形成自己的独立判断",
    }
    return findings.get(step, "需要进一步分析")


def _find_conclusion(text: str) -> str:
    markers = ["因此", "所以", "结论是", "由此可见", "综上", "总之", "这表明"]
    for marker in markers:
        if marker in text:
            idx = text.index(marker)
            return f"检测到结论标记词'{marker}'，结论可能为：{text[idx:idx+50].strip()}..."
    return "未发现明显的结论标记词，需自行推断作者的核心主张"


def _find_reasons(text: str) -> str:
    markers = ["因为", "由于", "原因是", "根据", "基于", "理由"]
    count = sum(1 for m in markers if m in text)
    if count > 0:
        return f"发现{count}处理由标记词，论证提供了支撑依据"
    return "未发现明显的理由标记词，论证可能缺乏充分依据"


def _find_ambiguity(text: str) -> str:
    ambiguous = ["好", "有效", "重要", "成功", "更好", "应该", "适当", "合理"]
    found = [w for w in ambiguous if w in text]
    if found:
        return f"发现潜在歧义词：{', '.join(found)}。这些词在不同语境下含义不同，需进一步澄清。"
    return "未发现明显的歧义词"


def _evidence_improvement(level: int) -> str:
    improvements = {
        1: "证据强度较高。仍建议核实研究的可重复性和样本代表性。",
        2: "建议补充更大规模的系统性研究来验证案例发现。",
        3: "建议寻找更客观的实验或统计数据支撑，而非仅依赖专家意见。",
        4: "建议避免仅凭个人经验下结论，寻找系统性研究或统计数据支撑。",
    }
    return improvements.get(level, "建议提升证据质量。")
