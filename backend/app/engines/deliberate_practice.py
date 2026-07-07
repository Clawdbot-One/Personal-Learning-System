"""引擎一：自适应刻意练习引擎
源自 Anders Ericsson《刻意练习》—— 心理表征构建、舒适区边缘训练、即时反馈闭环、技能分解
"""
import random
import math
from typing import Optional


# 题库（按领域和难度组织）
QUESTION_BANK = {
    "python": [
        {"id": "py_01", "difficulty": 0.2, "q": "Python中如何创建一个空列表？", "options": ["list()", "[]", "{}", "list[]"], "answer": "[]", "hint": "两种方式：list() 或 []"},
        {"id": "py_02", "difficulty": 0.2, "q": "以下哪个是正确的变量命名？", "options": ["2name", "my-var", "_count", "class"], "answer": "_count", "hint": "变量名不能以数字开头，不能含连字符，不能是关键字"},
        {"id": "py_03", "difficulty": 0.3, "q": "list.append() 和 list.extend() 的区别是？", "options": ["没有区别", "append添加一个元素，extend添加多个", "append更快", "extend只能添加数字"], "answer": "append添加一个元素，extend添加多个", "hint": "append添加单个对象，extend接受可迭代对象展开添加"},
        {"id": "py_04", "difficulty": 0.4, "q": "列表推导式 [x*2 for x in range(5)] 的结果是？", "options": ["[0,2,4,6,8]", "[2,4,6,8,10]", "[0,1,2,3,4]", "[0,2,4,6,8,10]"], "answer": "[0,2,4,6,8]", "hint": "range(5)生成0-4，每个乘2"},
        {"id": "py_05", "difficulty": 0.5, "q": "以下代码输出什么？\nx = [1,2,3]\ny = x\ny.append(4)\nprint(x)", "options": ["[1,2,3]", "[1,2,3,4]", "报错", "[1,2,3,4]和y相同"], "answer": "[1,2,3,4]", "hint": "列表是可变对象，y=x是引用赋值，修改y也影响x"},
        {"id": "py_06", "difficulty": 0.6, "q": "装饰器的本质是什么？", "options": ["一个类", "接受函数返回函数的高阶函数", "一种语法糖", "B和C都对"], "answer": "B和C都对", "hint": "装饰器本质是高阶函数，@语法是语法糖"},
        {"id": "py_07", "difficulty": 0.7, "q": "生成器与列表的区别是什么？", "options": ["生成器更快", "生成器惰性求值，节省内存", "列表可以迭代，生成器不行", "没有区别"], "answer": "生成器惰性求值，节省内存", "hint": "生成器使用yield，按需产生值，不一次性占用内存"},
        {"id": "py_08", "difficulty": 0.8, "q": "GIL对多线程的影响是？", "options": ["没有影响", "同一时刻只有一个线程执行Python字节码", "使多线程更快", "只影响I/O操作"], "answer": "同一时刻只有一个线程执行Python字节码", "hint": "GIL(全局解释器锁)限制了CPython中线程的并行执行"},
        {"id": "py_09", "difficulty": 0.9, "q": "元类(metaclass)的主要用途是？", "options": ["创建类的类", "提高性能", "替代继承", "管理内存"], "answer": "创建类的类", "hint": "元类是'类的类'，用于控制类的创建行为，type是最常见的元类"},
    ],
    "general": [
        {"id": "gn_01", "difficulty": 0.2, "q": "以下哪个属于'主动学习'？", "options": ["听讲座", "阅读教材", "做练习题", "看视频"], "answer": "做练习题", "hint": "主动学习需要学习者参与产出，做练习题属于主动学习"},
        {"id": "gn_02", "difficulty": 0.3, "q": "艾宾浩斯遗忘曲线说明什么？", "options": ["记忆永不过期", "遗忘先快后慢", "只重复一次就够了", "遗忘速度恒定"], "answer": "遗忘先快后慢", "hint": "学习后遗忘立即开始，初期最快，之后逐渐变慢"},
        {"id": "gn_03", "difficulty": 0.4, "q": "费曼学习法的核心是？", "options": ["大量刷题", "用简单语言向他人解释", "记忆所有细节", "只看不做"], "answer": "用简单语言向他人解释", "hint": "费曼学习法通过教授他人来检验和加深理解"},
        {"id": "gn_04", "difficulty": 0.5, "q": "番茄工作法的一个标准周期是？", "options": ["25分钟工作+5分钟休息", "50分钟工作+10分钟休息", "15分钟工作+5分钟休息", "45分钟工作+15分钟休息"], "answer": "25分钟工作+5分钟休息", "hint": "标准番茄钟为25分钟专注+5分钟休息，4个番茄后长休15-30分钟"},
        {"id": "gn_05", "difficulty": 0.6, "q": "心流状态的最佳条件是？", "options": ["任务极其简单", "挑战远超技能", "挑战与技能平衡", "完全无压力"], "answer": "挑战与技能平衡", "hint": "Csikszentmihalyi的心流理论：挑战与技能匹配时最易进入心流"},
        {"id": "gn_06", "difficulty": 0.7, "q": "间隔重复(Spaced Repetition)的原理是？", "options": ["每天重复相同内容", "在即将遗忘时复习", "一次性大量重复", "随机时间复习"], "answer": "在即将遗忘时复习", "hint": "基于遗忘曲线，在记忆即将消退时复习以强化长期记忆"},
        {"id": "gn_07", "difficulty": 0.8, "q": "元认知(Metacognition)指的是？", "options": ["关于记忆的知识", "对自身思维过程的认知和监控", "学习元数据", "超越认知的能力"], "answer": "对自身思维过程的认知和监控", "hint": "元认知是'对认知的认知'，包括计划、监控和评估自己的学习过程"},
    ],
    "data_science": [
        {"id": "ds_01", "difficulty": 0.3, "q": "Pandas中DataFrame类似什么数据结构？", "options": ["列表", "字典", "Excel表格", "集合"], "answer": "Excel表格", "hint": "DataFrame是二维表格结构，类似Excel或SQL表"},
        {"id": "ds_02", "difficulty": 0.4, "q": "NumPy数组相比Python列表的优势是？", "options": ["更灵活", "内存连续，运算更快", "可以存储混合类型", "语法更简单"], "answer": "内存连续，运算更快", "hint": "NumPy数组在内存中连续存储，支持向量化运算，性能远超列表"},
        {"id": "ds_03", "difficulty": 0.5, "q": "什么是过拟合(Overfitting)？", "options": ["模型太简单", "模型在训练集表现好但泛化差", "训练数据太少", "模型收敛太慢"], "answer": "模型在训练集表现好但泛化差", "hint": "过拟合指模型过度学习训练数据细节，导致在新数据上表现差"},
        {"id": "ds_04", "difficulty": 0.6, "q": "交叉验证的主要目的是？", "options": ["加速训练", "更可靠地评估模型性能", "增加数据量", "简化模型"], "answer": "更可靠地评估模型性能", "hint": "交叉验证通过多次划分数据评估，减少评估的方差"},
        {"id": "ds_05", "difficulty": 0.7, "q": "L1正则化(Lasso)的特点是？", "options": ["产生稀疏权重", "只缩小权重", "增加模型复杂度", "没有特殊效果"], "answer": "产生稀疏权重", "hint": "L1正则化使部分权重变为0，实现特征选择"},
    ],
}

SKILL_TREES = {
    "python": {
        "name": "Python编程",
        "nodes": [
            {"id": "py_base", "name": "基础语法", "level": "beginner", "prerequisites": []},
            {"id": "py_data_struct", "name": "数据结构", "level": "beginner", "prerequisites": ["py_base"]},
            {"id": "py_func", "name": "函数与模块", "level": "intermediate", "prerequisites": ["py_data_struct"]},
            {"id": "py_oop", "name": "面向对象", "level": "intermediate", "prerequisites": ["py_func"]},
            {"id": "py_decorator", "name": "装饰器", "level": "advanced", "prerequisites": ["py_oop", "py_func"]},
            {"id": "py_generator", "name": "生成器与迭代器", "level": "advanced", "prerequisites": ["py_func"]},
            {"id": "py_concurrent", "name": "并发编程", "level": "advanced", "prerequisites": ["py_oop"]},
            {"id": "py_meta", "name": "元编程", "level": "expert", "prerequisites": ["py_decorator", "py_oop"]},
        ],
    },
    "data_science": {
        "name": "数据科学",
        "nodes": [
            {"id": "ds_base", "name": "数学基础", "level": "beginner", "prerequisites": []},
            {"id": "ds_numpy", "name": "NumPy", "level": "beginner", "prerequisites": ["ds_base"]},
            {"id": "ds_pandas", "name": "Pandas", "level": "intermediate", "prerequisites": ["ds_numpy"]},
            {"id": "ds_viz", "name": "数据可视化", "level": "intermediate", "prerequisites": ["ds_pandas"]},
            {"id": "ds_ml", "name": "机器学习", "level": "advanced", "prerequisites": ["ds_pandas", "ds_base"]},
            {"id": "ds_dl", "name": "深度学习", "level": "expert", "prerequisites": ["ds_ml"]},
        ],
    },
}


def generate_practice(domain: str = "general", difficulty: float = 0.5, count: int = 5) -> list[dict]:
    """生成自适应练习题 —— 舒适区边缘训练"""
    bank = QUESTION_BANK.get(domain, QUESTION_BANK["general"])
    # 按难度筛选：选择当前难度±0.2范围内的题目
    candidates = [q for q in bank if abs(q["difficulty"] - difficulty) <= 0.25]
    if len(candidates) < count:
        # 扩大范围
        candidates = sorted(bank, key=lambda q: abs(q["difficulty"] - difficulty))[:count + 2]
    selected = random.sample(candidates, min(count, len(candidates)))
    result = []
    for q in selected:
        correct_idx = q["options"].index(q["answer"]) if q["answer"] in q["options"] else 0
        result.append({
            "id": q["id"],
            "question": q["q"],
            "options": q["options"],
            "correct": correct_idx,
            "explanation": q.get("hint", ""),
            "difficulty": q["difficulty"],
            "domain": domain,
        })
    return result


def evaluate_practice(answers: list[dict]) -> dict:
    """评估练习结果 —— 即时反馈闭环。支持 index(int) 或 text(str) 答案"""
    all_questions = {}
    for domain_bank in QUESTION_BANK.values():
        for q in domain_bank:
            all_questions[q["id"]] = q

    correct_count = 0
    total = len(answers)
    feedback = []

    for ans in answers:
        qid = ans.get("question_id", "")
        user_answer = ans.get("answer", "")
        question = all_questions.get(qid, {})
        correct_text = question.get("answer", "")
        options = question.get("options", [])

        # 支持 index(int) 或 text(str) 两种答案格式
        if isinstance(user_answer, int) and options:
            user_text = options[user_answer] if 0 <= user_answer < len(options) else str(user_answer)
            is_correct = user_text == correct_text
        else:
            user_text = str(user_answer)
            is_correct = user_text == correct_text

        if is_correct:
            correct_count += 1
        feedback.append({
            "question_id": qid,
            "question": question.get("q", ""),
            "your_answer": user_text,
            "correct_answer": correct_text,
            "is_correct": is_correct,
            "hint": question.get("hint", ""),
            "difficulty": question.get("difficulty", 0.5),
            "error_analysis": _analyze_error(question.get("q", ""), user_text, correct_text, is_correct),
        })

    accuracy = correct_count / total if total > 0 else 0
    return {
        "correct_count": correct_count,
        "total": total,
        "accuracy": accuracy,
        "performance_score": accuracy,
        "feedback": feedback,
    }


def adjust_difficulty(current: float, performance: float) -> float:
    """自适应难度调整 —— IRT简化模型"""
    if performance >= 0.8:
        # 正确率高，升级到更有挑战的难度
        new_diff = min(1.0, current + 0.15)
    elif performance >= 0.6:
        # 适度提升
        new_diff = min(1.0, current + 0.05)
    elif performance >= 0.4:
        # 保持当前难度
        new_diff = current
    else:
        # 正确率低，降低难度回到舒适区边缘
        new_diff = max(0.1, current - 0.15)
    return round(new_diff, 2)


def get_skill_tree(domain: str = "python") -> dict:
    """获取技能树 —— 技能分解"""
    return SKILL_TREES.get(domain, SKILL_TREES["python"])


def get_learning_zone(current_difficulty: float, recent_performance: float) -> dict:
    """计算学习区边界 —— 舒适区边缘"""
    comfort = max(0.1, current_difficulty - 0.2)
    stretch = current_difficulty
    panic = min(1.0, current_difficulty + 0.3)
    return {
        "comfort_zone": round(comfort, 2),      # 舒适区（太简单）
        "learning_zone": round(stretch, 2),      # 学习区（最优）
        "panic_zone": round(panic, 2),           # 恐慌区（太难）
        "recommendation": _zone_recommendation(recent_performance),
    }


def _analyze_error(question: str, user_answer: str, correct_answer: str, is_correct: bool) -> str:
    """错误根因分析 —— 即时反馈"""
    if is_correct:
        return "回答正确！概念理解到位。"
    analyses = [
        f"错误类型：概念混淆。正确答案是'{correct_answer}'，请回顾相关概念的定义。",
        f"错误类型：细节遗漏。注意题目中的关键词，正确答案是'{correct_answer}'。",
        f"错误类型：推理跳跃。需要更完整的分析步骤，正确答案是'{correct_answer}'。",
        f"错误类型：记忆偏差。建议使用间隔重复加强记忆，正确答案是'{correct_answer}'。",
    ]
    return random.choice(analyses)


def _zone_recommendation(performance: float) -> str:
    if performance >= 0.85:
        return "当前难度偏低，可以挑战更高难度以保持心流状态"
    elif performance >= 0.6:
        return "处于最佳学习区，保持当前节奏"
    elif performance >= 0.4:
        return "稍有吃力，建议复习基础知识后再挑战"
    else:
        return "难度偏高，建议降低难度回到舒适区边缘，先巩固基础"
