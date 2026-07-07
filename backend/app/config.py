"""应用配置管理"""
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 数据库
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'learnflow.db'}")

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "learnflow-secret-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7天

# CORS
CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:4173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
]

# 奖励配置
REWARD_CONFIG = {
    "session_complete": 10,       # 完成一次学习会话
    "focus_complete": 15,         # 完成一次专注
    "milestone_complete": 50,     # 完成里程碑
    "plan_complete": 200,         # 完成学习计划
    "streak_bonus": 5,            # 连续学习奖励
    "knowledge_node": 5,          # 创建知识节点
    "reading_note": 3,            # 阅读笔记
    "action_item_done": 8,        # 完成行动项
    "critical_analysis": 12,      # 批判性分析
    "feynman_output": 20,         # 费曼输出
}

# 等级体系 (社会学维度)
LEVELS = [
    {"name": "学徒", "min_points": 0, "icon": "🌱"},
    {"name": "行者", "min_points": 100, "icon": "⚡"},
    {"name": "匠人", "min_points": 500, "icon": "🔨"},
    {"name": "专家", "min_points": 1500, "icon": "🎯"},
    {"name": "大师", "min_points": 5000, "icon": "👑"},
    {"name": "宗师", "min_points": 15000, "icon": "🌟"},
]

# 成就定义
ACHIEVEMENTS = {
    "first_session": {"name": "初次启程", "desc": "完成第一次学习会话", "icon": "🚀"},
    "streak_7": {"name": "一周不辍", "desc": "连续学习7天", "icon": "🔥"},
    "streak_30": {"name": "月度坚持", "desc": "连续学习30天", "icon": "💎"},
    "first_plan": {"name": "目标明确", "desc": "创建第一个学习计划", "icon": "📋"},
    "plan_complete": {"name": "言出必行", "desc": "完成一个学习计划", "icon": "🏆"},
    "knowledge_10": {"name": "知识构建", "desc": "创建10个知识节点", "icon": "🧠"},
    "knowledge_50": {"name": "知识网络", "desc": "创建50个知识节点", "icon": "🕸️"},
    "focus_10": {"name": "深度专注", "desc": "完成10次深度工作", "icon": "🧘"},
    "reading_5": {"name": "博览群书", "desc": "记录5本书的阅读笔记", "icon": "📚"},
    "critical_10": {"name": "批判之眼", "desc": "完成10次批判性分析", "icon": "🔍"},
    "feynman_1": {"name": "费曼达人", "desc": "完成第一次费曼输出", "icon": "🎓"},
    "action_10": {"name": "知行合一", "desc": "完成10个行动项", "icon": "⚔️"},
}
