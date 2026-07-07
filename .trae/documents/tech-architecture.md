# LearnFlow 技术架构与实现方案

> 基于 `documents/learnflow-prd/learnflow-prd.html` 产品需求文档，制定可落地的全栈 MVP 技术方案。

## 一、技术栈选型（MVP 实现）

| 层级 | PRD 目标方案 | MVP 实现方案 | 说明 |
|------|-------------|-------------|------|
| 前端框架 | React 18 + TypeScript | React 18 + TypeScript + Vite | 一致 |
| UI 组件 | Ant Design 5 + Tailwind | Tailwind CSS + Lucide Icons + 自研组件 | 轻量化，设计自由度高 |
| 状态管理 | Zustand + React Query | Zustand + 原生 fetch | 简化依赖 |
| 图谱可视化 | D3.js + React Flow | React Flow (@xyflow/react) | 交互式节点图 |
| 图表 | — | Recharts | 学习数据可视化 |
| 后端框架 | Python FastAPI | Python FastAPI | 一致 |
| 数据库 | PostgreSQL 16 + Neo4j | SQLite (SQLAlchemy ORM) | 无外部依赖，知识图谱用邻接表实现 |
| 缓存 | Redis | 内存缓存 | 简化部署 |
| AI Agent | LangChain + Hermes/OpenClaw/HiClaw | 规则引擎 Agent 模拟层 | 架构预留 LLM 接入点 |
| 认证 | JWT + OAuth2 | JWT (PyJWT + passlib) | 核心认证完整实现 |

## 二、项目结构

```
/workspace
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py            # 应用入口 + CORS + 路由注册
│   │   ├── config.py          # 配置管理
│   │   ├── database.py        # SQLAlchemy 引擎与会话
│   │   ├── models.py          # 全部 ORM 模型
│   │   ├── schemas.py         # Pydantic 请求/响应模型
│   │   ├── auth.py            # JWT 认证依赖
│   │   ├── seed.py            # 初始化种子数据
│   │   ├── routers/           # API 路由模块
│   │   │   ├── auth.py        # 注册/登录/当前用户
│   │   │   ├── plans.py       # 学习计划 CRUD
│   │   │   ├── learning.py    # 学习会话 + 五大引擎
│   │   │   ├── knowledge.py   # 知识图谱节点与关系
│   │   │   ├── rewards.py     # 积分/成就/排行榜
│   │   │   ├── agent.py       # Agent 对话与分析
│   │   │   └── analytics.py   # 学习分析仪表盘
│   │   ├── engines/           # 五大学习方法论引擎
│   │   │   ├── deliberate_practice.py   # 刻意练习：自适应难度+技能分解
│   │   │   ├── sponge_reading.py        # 海绵阅读法：三层笔记+能力评估
│   │   │   ├── deep_work.py             # 深度工作：番茄钟+专注统计
│   │   │   ├── knowledge_action.py      # 知行转化：行动计划+费曼输出
│   │   │   └── critical_thinking.py     # 学会提问：论证分析+谬误检测
│   │   └── agent/             # Agent 协同层
│   │       ├── manager.py     # Manager Agent：任务调度与编排
│   │       └── workers.py     # Worker Agents：五大导师角色
│   ├── requirements.txt
│   └── run.py                 # 启动脚本
├── src/                        # React 前端
│   ├── components/            # 通用组件
│   ├── pages/                 # 页面组件
│   ├── store/                 # Zustand 状态管理
│   ├── api/                   # API 调用封装
│   ├── types/                 # TypeScript 类型定义
│   ├── App.tsx
│   └── main.tsx
├── documents/                  # 已有 PRD 文档
└── .trae/documents/           # 技术文档
```

## 三、数据库模型（SQLite + SQLAlchemy）

### 核心表

1. **users** — 用户：id, username, email, password_hash, avatar, preferences(JSON), level, total_points, created_at
2. **learning_plans** — 学习计划：id, user_id, title, description, status, target_skills(JSON), deadline, created_at
3. **plan_milestones** — 里程碑：id, plan_id, title, target_date, completed, order_index
4. **learning_sessions** — 学习会话：id, user_id, plan_id, engine_type, session_data(JSON), difficulty_level, performance_score, duration_minutes, started_at, completed_at
5. **knowledge_nodes** — 知识节点：id, user_id, concept, description, category, mastery_level, source, created_at
6. **knowledge_relations** — 知识关系：id, source_id, target_id, relation_type, strength
7. **reading_notes** — 阅读笔记（三层）：id, user_id, book_title, layer(fragments/chapter/book), content, linked_node_id, created_at
8. **rewards** — 奖励记录：id, user_id, reward_type, points, badge_name, metadata(JSON), earned_at
9. **achievements** — 成就解锁：id, user_id, achievement_key, earned_at
10. **focus_sessions** — 专注会话：id, user_id, planned_minutes, actual_minutes, distraction_count, strategy, started_at, completed_at
11. **action_items** — 行动项（知行转化）：id, user_id, knowledge_node_id, description, status, due_date, review_dates(JSON)
12. **skill_trees** — 技能树：id, user_id, domain, nodes(JSON), created_at
13. **agent_conversations** — Agent 对话：id, user_id, role, content, agent_type, metadata(JSON), created_at
14. **leaderboard_cache** — 排行榜缓存：user_id, rank, points, period

## 四、五大学习引擎实现

### 引擎一：刻意练习 (deliberate_practice)
- **技能分解**：树状技能结构，自动拆解子技能
- **自适应难度**：基于 IRT 简化模型，根据正确率调整难度（正确率>80%升级，<50%降级）
- **即时反馈**：练习完成后生成错误根因分析
- **舒适区边缘**：计算并维护用户当前"学习区"难度值

### 引擎二：海绵阅读法 (sponge_reading)
- **三层笔记**：碎片层(片段摘录) → 章节层(结构整理) → 全书层(核心提炼)
- **七大能力雷达**：选书、速读、精读、笔记、记忆、输出、复用 七维度评估
- **阅读阶段诊断**：入门/进阶/熟练/精通 四阶段判定
- **AI 读书报告**：碎片笔记自动整合为结构化输出

### 引擎三：深度工作 (deep_work)
- **番茄钟**：25min专注 + 5min休息，可自定义
- **深度/浅层分类**：会话标记类型，统计深度工作占比
- **注意力残留防护**：切换检测与冷却提醒
- **四种策略**：禁欲者/节奏型/新闻记者/双峰型 策略推荐
- **精力曲线**：按时段统计专注效率，识别高效时段

### 引擎四：知行转化 (knowledge_action)
- **知行差距诊断**：收藏数 vs 实践数比率分析
- **精要筛选**：每日推荐限额（少而精）
- **绿灯思维**：两步评估流程（先发掘潜力→再批判分析）
- **7天行动计划**：自动生成行动项 + 间隔复习提醒
- **费曼输出**：Agent 扮演学生提问，评估解释质量

### 引擎五：批判性思维 (critical_thinking)
- **海绵/淘金模式切换**：快速浏览 vs 批判精读
- **11步论证分析**：结论→理由→歧义词→价值观假设→描述性假设→推理谬误→证据强度→替代原因→数据可靠性→省略信息→合理结论
- **谬误检测**：常见逻辑谬误识别（人身攻击、滑坡、稻草人等）
- **证据分级**：系统观察/案例研究/专家意见/个人经验 四级评估

## 五、Agent 协同架构

```
用户消息 → Manager Agent（学习规划师）
         → 意图识别（计划/练习/阅读/专注/批判/行动）
         → 派发至对应 Worker Agent
         → Worker 执行引擎逻辑 + 生成响应
         → Manager 整合回复 + 触发奖励
         → 返回用户
```

- **Manager Agent**：意图分类、任务编排、上下文管理
- **Worker Agents**：5个专业导师（阅读/练习/专注/思维/行动），各调用对应引擎
- **Support Agents**：进度追踪者（生成报告）、激励官（发放奖励）
- **LLM 接入预留**：`agent/llm_client.py` 接口，当前用规则引擎实现，可替换为真实 LLM API

## 六、跨学科奖励机制

### 心理学层
- 连续学习天数 → 变动比率惊喜奖励
- 心流状态保护 → 不中断，结束后总结奖励
- 渐进式成就 → 胜任感满足

### 社会学层
- 学习等级体系：学徒→学徒→匠人→专家→大师
- 排行榜：周/月/全周期，只显示前N名+自身位置
- 师徒系统：经验值加成

### 金融学层
- 学习积分代币：赚取（学习挖矿）→ 消耗（兑换）→ 质押（锁仓增益）
- 学习期货：目标承诺金机制（保证金模式）
- ROI 量化：时间投入 vs 掌握度产出

## 七、API 端点设计

```
认证:     POST /api/v1/auth/register, /api/v1/auth/login
          GET  /api/v1/auth/me
计划:     GET/POST /api/v1/plans, GET/PUT/DELETE /api/v1/plans/{id}
学习:     POST /api/v1/learning/sessions, POST .../complete
          GET  /api/v1/learning/engines (引擎列表)
          POST /api/v1/learning/practice (刻意练习)
          POST /api/v1/reading/notes (海绵阅读笔记)
          POST /api/v1/reading/report (生成读书报告)
          POST /api/v1/critical/analyze (批判性分析)
          POST /api/v1/action/items (行动项)
图谱:     GET /api/v1/knowledge/graph, POST /api/v1/knowledge/nodes
专注:     POST /api/v1/focus/start, POST /api/v1/focus/complete
          GET  /api/v1/focus/stats
奖励:     GET /api/v1/rewards/balance, /api/v1/rewards/leaderboard
          GET /api/v1/rewards/achievements, POST /api/v1/rewards/claim
Agent:    POST /api/v1/agent/chat, GET /api/v1/agent/history
分析:     GET /api/v1/analytics/dashboard, /api/v1/analytics/skills
```

## 八、前端页面清单

| 页面 | 路由 | 核心功能 | 优先级 |
|------|------|---------|--------|
| 登录/注册 | /auth | JWT 认证 | P0 |
| 学习仪表盘 | / | 今日任务、统计概览、Agent入口 | P0 |
| 学习计划 | /plans | 计划 CRUD、里程碑、进度 | P0 |
| 深度工作 | /deep-work | 番茄钟、专注统计、策略选择 | P0 |
| 知识图谱 | /knowledge-graph | 交互式图谱、节点编辑 | P0 |
| 练习中心 | /practice | 自适应练习、即时反馈、错题 | P1 |
| 阅读工作台 | /reader | 三层笔记、能力雷达 | P1 |
| 批判思维 | /critical-thinking | 论证分析、谬误检测 | P1 |
| 奖励中心 | /rewards | 积分、成就墙、排行榜 | P1 |
| Agent对话 | /agent | 多导师对话、学习建议 | P1 |

## 九、设计系统

- **主色**：#2563eb (蓝) / **辅助色**：#f59e0b (金) / **背景**：#f8f9fb / **文字**：#1a1f36
- **布局**：左侧导航(240px) + 主内容区(自适应) + 右侧Agent面板(可折叠 360px)
- **字体**：Instrument Sans (标题) + WorkSans (正文) + JetBrains Mono (代码) — 复用 documents 内字体
- **圆角**：8px (卡片) / 6px (按钮) / 12px (面板)
