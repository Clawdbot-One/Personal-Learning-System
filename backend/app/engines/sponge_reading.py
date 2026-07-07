"""引擎二：渐进式阅读与知识内化引擎
源自李小墨《海绵阅读法》—— 三层笔记结构、七大能力体系、四阶段进阶模型
"""
from collections import defaultdict


# 七大阅读能力维度
READING_ABILITIES = [
    "选书能力", "速读能力", "精读能力", "笔记能力", "记忆能力", "输出能力", "复用能力",
]

# 四阶段进阶
READING_STAGES = [
    {"name": "入门阶段", "desc": "建立阅读习惯，掌握基础笔记方法", "min_score": 0},
    {"name": "进阶阶段", "desc": "能高效提取核心信息，建立知识关联", "min_score": 25},
    {"name": "熟练阶段", "desc": "融会贯通，能输出高质量读书笔记", "min_score": 50},
    {"name": "精通阶段", "desc": "知识内化，能跨领域复用和批判性思考", "min_score": 75},
]

# 三层笔记说明
NOTE_LAYERS = {
    "fragments": {
        "name": "碎片层",
        "desc": "第一遍阅读时摘录的关键片段、金句、概念",
        "guide": "快速浏览全书，标记打动你的段落、核心概念、重要数据。不要停顿太久，保持阅读流畅。",
    },
    "chapter": {
        "name": "章节层",
        "desc": "第二遍阅读时整理的章节结构、逻辑脉络",
        "guide": "按章节梳理逻辑结构，用思维导图呈现章节间关系，找出作者的论证主线。",
    },
    "book": {
        "name": "全书层",
        "desc": "第三遍阅读后提炼的核心观点、个人洞察、行动计划",
        "guide": "回答三个核心问题：这本书讲了什么？对我有什么启发？我要采取什么行动？",
    },
}


def generate_reading_report(book_title: str, notes: list[dict]) -> dict:
    """AI读书报告生成 —— 碎片笔记自动整合为结构化输出"""
    fragments = [n for n in notes if n.get("layer") == "fragments"]
    chapters = [n for n in notes if n.get("layer") == "chapter"]
    book_notes = [n for n in notes if n.get("layer") == "book"]

    # 提取关键概念
    all_content = " ".join(n.get("content", "") for n in notes)
    key_concepts = _extract_concepts(all_content)

    # 结构化报告
    report = {
        "book_title": book_title,
        "summary": _generate_summary(book_title, fragments, book_notes),
        "key_concepts": key_concepts,
        "chapter_structure": _organize_chapters(chapters),
        "core_insights": _extract_insights(book_notes),
        "action_items": _derive_actions(book_notes),
        "reading_stats": {
            "total_notes": len(notes),
            "fragments_count": len(fragments),
            "chapter_count": len(chapters),
            "book_count": len(book_notes),
        },
    }
    return report


def assess_reading_abilities(notes: list[dict], sessions: list[dict]) -> list[dict]:
    """七大能力雷达图评估"""
    # 基于笔记和阅读行为评估各维度能力
    scores = {}

    # 选书能力：根据阅读书籍的多样性
    books = set(n.get("book_title", "") for n in notes if n.get("book_title"))
    scores["选书能力"] = min(100, len(books) * 15 + 20)

    # 速读能力：根据碎片层笔记的频率
    fragments = [n for n in notes if n.get("layer") == "fragments"]
    scores["速读能力"] = min(100, len(fragments) * 8 + 30)

    # 精读能力：根据章节层笔记的深度
    chapters = [n for n in notes if n.get("layer") == "chapter"]
    avg_chapter_len = sum(len(n.get("content", "")) for n in chapters) / max(1, len(chapters))
    scores["精读能力"] = min(100, int(avg_chapter_len / 5) + 25)

    # 笔记能力：根据三层笔记的完整性
    has_all_layers = bool(fragments and chapters and [n for n in notes if n.get("layer") == "book"])
    base_note_score = 50 if has_all_layers else 30
    scores["笔记能力"] = min(100, base_note_score + len(notes) * 2)

    # 记忆能力：根据复习频率（简化）
    scores["记忆能力"] = min(100, len(sessions) * 5 + 35)

    # 输出能力：根据全书层笔记
    book_notes = [n for n in notes if n.get("layer") == "book"]
    scores["输出能力"] = min(100, len(book_notes) * 12 + 25)

    # 复用能力：根据知识关联
    scores["复用能力"] = min(100, len(sessions) * 3 + 30)

    return [{"ability": k, "score": v} for k, v in scores.items()]


def diagnose_reading_stage(abilities: list[dict]) -> dict:
    """四阶段诊断"""
    avg_score = sum(a["score"] for a in abilities) / len(abilities) if abilities else 0
    current_stage = READING_STAGES[0]
    for stage in READING_STAGES:
        if avg_score >= stage["min_score"]:
            current_stage = stage

    # 推荐策略
    strategies = {
        "入门阶段": "重点培养速读和笔记能力，先建立三层笔记习惯。建议从实用类书籍开始。",
        "进阶阶段": "加强精读和输出能力，尝试写完整的读书笔记。开始建立跨书知识关联。",
        "熟练阶段": "提升复用能力，将书本知识应用于实际。尝试费曼输出法教授他人。",
        "精通阶段": "跨领域融合，批判性阅读。建立个人知识体系，持续输出原创内容。",
    }

    return {
        "stage": current_stage["name"],
        "description": current_stage["desc"],
        "avg_score": round(avg_score, 1),
        "strategy": strategies.get(current_stage["name"], ""),
        "weakest_ability": min(abilities, key=lambda x: x["score"])["ability"] if abilities else "",
    }


def get_note_layer_guide(layer: str) -> dict:
    """获取笔记层指导"""
    return NOTE_LAYERS.get(layer, NOTE_LAYERS["fragments"])


def _extract_concepts(text: str) -> list[str]:
    """简易概念提取"""
    import re
    # 提取引号内的内容、大写开头的短语、中文术语
    quoted = re.findall(r'[""「」]([^""「」]+)[""「」]', text)
    # 去重
    seen = set()
    concepts = []
    for c in quoted:
        if c not in seen and len(c) > 1:
            seen.add(c)
            concepts.append(c)
    return concepts[:10]


def _generate_summary(title: str, fragments: list[dict], book_notes: list[dict]) -> str:
    if book_notes:
        return book_notes[0].get("content", "")[:300]
    if fragments:
        contents = [f.get("content", "") for f in fragments[:3]]
        return f"《{title}》的核心要点：" + "；".join(contents) + "。"
    return f"《{title}》的阅读笔记尚在整理中，建议补充三层笔记以获得完整报告。"


def _organize_chapters(chapters: list[dict]) -> list[dict]:
    return [{"chapter": c.get("chapter_info", ""), "content": c.get("content", "")[:200]} for c in chapters]


def _extract_insights(book_notes: list[dict]) -> list[str]:
    insights = []
    for n in book_notes:
        content = n.get("content", "")
        # 按句号分句，选取有洞察的句子
        sentences = content.replace("。", "。\n").replace("！", "！\n").split("\n")
        for s in sentences:
            if any(kw in s for kw in ["启发", "洞察", "本质", "关键", "核心", "发现"]):
                insights.append(s.strip())
    return insights[:5] if insights else ["建议补充全书层笔记以提炼个人洞察"]


def _derive_actions(book_notes: list[dict]) -> list[str]:
    actions = []
    for n in book_notes:
        content = n.get("content", "")
        import re
        # 提取包含行动词的句子
        sentences = re.split(r'[。\n！]', content)
        for s in sentences:
            if any(kw in s for kw in ["应该", "需要", "计划", "尝试", "开始", "实践", "应用"]):
                actions.append(s.strip())
    return actions[:3] if actions else ["建议从全书层笔记中提炼具体行动项"]
