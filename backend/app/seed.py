"""LearnFlow 种子数据 - 用于演示与开发测试"""
import json
from datetime import datetime, timezone, timedelta

from .database import SessionLocal, init_db, Base, engine
from .models import (
    User, LearningPlan, PlanMilestone, KnowledgeNode, KnowledgeRelation,
    ReadingNote, FocusSession, ActionItem, Achievement, Reward,
)
from .auth import hash_password


def seed():
    """创建演示用户与示例数据"""
    init_db()
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # 检查是否已有演示用户
        existing = db.query(User).filter(User.username == "demo").first()
        if existing:
            print("种子数据已存在，跳过。")
            return

        # 1. 创建演示用户
        user = User(
            username="demo",
            email="demo@learnflow.ai",
            password_hash=hash_password("demo123456"),
            bio="终身学习者 · 探索知识的边界",
            total_points=380,
            streak_days=7,
            last_active_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            preferences=json.dumps({
                "engines": ["deliberate_practice", "sponge_reading", "deep_work"],
                "daily_goal_minutes": 120,
                "preferred_strategy": "rhythmic",
            }, ensure_ascii=False),
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 2. 学习计划
        plan1 = LearningPlan(
            user_id=user.id,
            title="30天精通 Python 数据科学",
            description="结合刻意练习与海绵阅读法，系统掌握 Python 在数据科学领域的应用。",
            status="active",
            target_skills=json.dumps(["pandas", "numpy", "matplotlib", "scikit-learn"], ensure_ascii=False),
            deadline=datetime.now(timezone.utc) + timedelta(days=30),
            engines=json.dumps(["deliberate_practice", "sponge_reading", "knowledge_action"], ensure_ascii=False),
        )
        plan2 = LearningPlan(
            user_id=user.id,
            title="深度工作习惯养成",
            description="通过番茄钟与四种深度工作策略，培养每日3小时深度专注能力。",
            status="active",
            target_skills=json.dumps(["专注力", "时间管理", "心流"], ensure_ascii=False),
            deadline=datetime.now(timezone.utc) + timedelta(days=21),
            engines=json.dumps(["deep_work"], ensure_ascii=False),
        )
        db.add_all([plan1, plan2])
        db.commit()
        db.refresh(plan1)
        db.refresh(plan2)

        # 3. 里程碑
        milestones = [
            PlanMilestone(plan_id=plan1.id, title="完成 pandas 基础",
                          description="掌握 Series 与 DataFrame 的核心操作",
                          target_date=datetime.now(timezone.utc) + timedelta(days=7),
                          order_index=0, completed=True,
                          completed_at=datetime.now(timezone.utc) - timedelta(days=2)),
            PlanMilestone(plan_id=plan1.id, title="数据可视化实战",
                          description="使用 matplotlib 绘制5种常见图表",
                          target_date=datetime.now(timezone.utc) + timedelta(days=14),
                          order_index=1, completed=False),
            PlanMilestone(plan_id=plan1.id, title="机器学习入门",
                          description="完成 scikit-learn 第一个分类模型",
                          target_date=datetime.now(timezone.utc) + timedelta(days=25),
                          order_index=2, completed=False),
            PlanMilestone(plan_id=plan2.id, title="每日2个番茄钟",
                          description="连续7天完成每日2个25分钟番茄钟",
                          target_date=datetime.now(timezone.utc) + timedelta(days=7),
                          order_index=0, completed=False),
        ]
        db.add_all(milestones)

        # 4. 知识节点
        nodes_data = [
            ("Python 基础", "解释型语言，强调可读性与简洁", "programming", 0.9, "官方文档"),
            ("pandas", "Python 数据分析核心库", "data_science", 0.7, "Python for Data Analysis"),
            ("DataFrame", "二维表格数据结构", "data_science", 0.75, "pandas 文档"),
            ("NumPy", "科学计算基础库", "data_science", 0.6, "Scientific Python"),
            ("matplotlib", "Python 绑图库", "data_science", 0.5, "matplotlib 文档"),
            ("刻意练习", "有目的的、有反馈的、突破舒适区的练习", "methodology", 0.85, "《刻意练习》"),
            ("深度工作", "在无干扰状态下专注进行认知挑战性工作", "methodology", 0.8, "《深度工作》"),
            ("海绵阅读法", "三层笔记法，从碎片到体系", "methodology", 0.7, "《海绵阅读法》"),
            ("费曼技巧", "通过教授他人来检验理解深度", "methodology", 0.75, "《如何将知识转化为行动》"),
        ]
        node_objs = []
        for concept, desc, cat, mastery, source in nodes_data:
            n = KnowledgeNode(
                user_id=user.id, concept=concept, description=desc,
                category=cat, mastery_level=mastery, source=source,
            )
            db.add(n)
            node_objs.append(n)
        db.commit()

        # 5. 知识关系
        if len(node_objs) >= 5:
            relations = [
                (node_objs[0], node_objs[1], "prerequisite", 0.9),
                (node_objs[1], node_objs[2], "related", 0.8),
                (node_objs[1], node_objs[3], "related", 0.7),
                (node_objs[2], node_objs[4], "related", 0.7),
                (node_objs[5], node_objs[6], "related", 0.6),
                (node_objs[7], node_objs[8], "extends", 0.65),
            ]
            for src, tgt, rtype, strength in relations:
                db.add(KnowledgeRelation(
                    source_id=src.id, target_id=tgt.id,
                    relation_type=rtype, strength=strength,
                ))
        db.commit()

        # 6. 阅读笔记
        notes = [
            ReadingNote(user_id=user.id, book_title="刻意练习", author="安德斯·艾利克森",
                        layer="book",
                        content="天才并非天赋，而是大量刻意练习的结果。刻意练习的四大要素：明确目标、专注投入、即时反馈、突破舒适区。",
                        chapter_info="第1章"),
            ReadingNote(user_id=user.id, book_title="刻意练习", author="安德斯·艾利克森",
                        layer="chapter",
                        content="心理表征是区分高手与新手的关键。通过反复练习，高手能形成更精细、更高效的心理表征。",
                        chapter_info="第3章 心理表征"),
            ReadingNote(user_id=user.id, book_title="深度工作", author="卡尔·纽波特",
                        layer="book",
                        content="深度工作是稀缺且有价值的技能。四种策略：禁欲式、双峰式、节奏式、新闻记者式。",
                        chapter_info="第1-2章"),
            ReadingNote(user_id=user.id, book_title="海绵阅读法", author="李一诺",
                        layer="chapter",
                        content="三层笔记：碎片层记录灵感和金句，章节层提炼核心观点，全书层构建知识体系。",
                        chapter_info="第4章 三层笔记法"),
            ReadingNote(user_id=user.id, book_title="学会提问", author="尼尔·布朗",
                        layer="fragments",
                        content="批判性思维的起点：论题是什么？结论是什么？理由是什么？",
                        chapter_info="第2章"),
        ]
        db.add_all(notes)

        # 7. 专注会话
        for i in range(5):
            db.add(FocusSession(
                user_id=user.id,
                task_name=f"深度学习任务 #{i+1}",
                work_type="deep",
                strategy="rhythmic",
                planned_minutes=25,
                actual_minutes=25 if i < 3 else 20,
                distraction_count=i % 3,
                completed=i < 4,
                started_at=datetime.now(timezone.utc) - timedelta(days=i, hours=2),
                completed_at=datetime.now(timezone.utc) - timedelta(days=i, hours=1, minutes=40) if i < 4 else None,
            ))

        # 8. 行动项
        actions = [
            ActionItem(user_id=user.id, knowledge_node_id=node_objs[5].id,
                       description="本周用刻意练习法练习 pandas 数据清洗3次，每次30分钟",
                       status="completed",
                       review_dates=json.dumps([(datetime.now(timezone.utc) + timedelta(days=d)).isoformat()
                                                for d in [1, 3, 7, 14]], ensure_ascii=False),
                       completed_at=datetime.now(timezone.utc) - timedelta(days=1)),
            ActionItem(user_id=user.id, knowledge_node_id=node_objs[8].id,
                       description="向朋友讲解费曼技巧，并录制3分钟讲解视频",
                       status="in_progress",
                       due_date=datetime.now(timezone.utc) + timedelta(days=3)),
            ActionItem(user_id=user.id, knowledge_node_id=node_objs[6].id,
                       description="本周尝试节奏式深度工作，每日固定2个番茄钟",
                       status="pending",
                       due_date=datetime.now(timezone.utc) + timedelta(days=5)),
        ]
        db.add_all(actions)

        # 9. 成就
        achievements_keys = ["first_session", "streak_7", "first_plan", "knowledge_10", "focus_10"]
        for key in achievements_keys:
            db.add(Achievement(user_id=user.id, achievement_key=key))

        # 10. 奖励记录
        rewards = [
            Reward(user_id=user.id, reward_type="points", points=10,
                   description="完成第一次学习会话", badge_name=""),
            Reward(user_id=user.id, reward_type="points", points=50,
                   description="完成里程碑：pandas 基础", badge_name=""),
            Reward(user_id=user.id, reward_type="streak", points=35,
                   description="连续学习7天奖励", badge_name="🔥 一周不辍"),
            Reward(user_id=user.id, reward_type="surprise", points=20,
                   description="惊喜奖励：完成首次费曼输出",
                   badge_name="🎓 费曼达人",
                   meta=json.dumps({"trigger": "variable_ratio", "multiplier": 1.5})),
            Reward(user_id=user.id, reward_type="badge", points=0,
                   description="达成知识构建成就", badge_name="🧠 知识构建"),
        ]
        db.add_all(rewards)

        db.commit()
        print("✓ 种子数据创建完成")
        print("  演示账号: demo / demo123456")
        print(f"  用户ID: {user.id}")
        print(f"  计划数: 2 | 里程碑: 4 | 知识节点: {len(node_objs)}")
        print(f"  阅读笔记: 5 | 专注会话: 5 | 行动项: 3 | 成就: 5 | 奖励: 5")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
