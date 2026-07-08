# 🌊 LearnFlow — AI 驱动的个人学习辅助系统

> 融合**刻意练习、海绵阅读法、深度工作、知行转化、批判性思维**五大学习方法论，结合多 Agent 协同与跨学科（心理学 / 社会学 / 金融学）奖励机制，打造商业化级全栈学习平台。

## ✨ 核心特性

### 五大学习方法论引擎
| 引擎 | 方法论来源 | 核心能力 |
|------|-----------|---------|
| 🎯 刻意练习 | 《刻意练习》 | SM-2 间隔重复算法 + IRT 3PL 难度自适应 + 学习区(70-85%)调控 + 技能瓶颈检测 |
| 📚 海绵阅读 | 《海绵阅读法》 | 三层笔记（片段/章节/全书）+ 七大能力雷达 + 四阶段进阶诊断 |
| 🧠 深度工作 | 《深度工作》 | 四种策略（修道院/双峰/节奏/记者）+ 启动/关闭仪式 + 注意力残留防护 |
| 🔗 知行转化 | 《如何将知识转化为行动》 | 7 天行动计划 + 绿灯思维 + 费曼输出 + 知行断裂诊断 |
| 🔍 批判思维 | 《学会提问》 | 11 步提问清单 + 7 种谬误检测 + 证据分级 + 海绵/淘金双模式 |

### 跨学科奖励机制
- **心理学维度**：SDT 自我决定论、心流挑战-技能平衡、多巴胺可变比率奖励（惊喜宝箱）、操作性条件反射
- **社会学维度**：身份认同徽章、学习排行榜（Top-N + 自己，避免挫败感）、声望系统、学习小组
- **金融学维度**：代币经济、学习期货（承诺合约，损失厌恶）、学习 ROI 量化

### AI Agent 集成
- **Manager-Workers 架构**：6 个专家角色（规划师 / 阅读指导 / 练习教练 / 专注顾问 / 思维导师 / 行动教练）
- **多后端支持**：OpenClaw / Hermes Agent / HiClaw / 通用 LLM（OpenAI 兼容端点）
- **优雅降级**：未配置 LLM 时自动切换到规则引擎，平台始终可用

## 🏗️ 技术架构

```
┌─────────────────────────────────────────────┐
│              前端 (React 18 + TS)             │
│  Vite + Ant Design 5 + Tailwind + Zustand   │
│       + React Query + React Router 6         │
└──────────────────┬──────────────────────────┘
                   │ /api/v1 (REST + JWT)
┌──────────────────▼──────────────────────────┐
│           后端 (FastAPI + SQLAlchemy 2.0)     │
│  5 大引擎 + 奖励服务 + Agent 管理器 + 12 路由  │
└──────────────────┬──────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │  SQLite (默认零配置)  │  PostgreSQL (生产)
        └─────────────────────┘
```

### 技术栈
- **后端**：FastAPI 0.139 · SQLAlchemy 2.0 · Pydantic v2 · python-jose (JWT) · bcrypt
- **前端**：React 18 · TypeScript 5 · Vite 5 · Ant Design 5 · Tailwind CSS 3 · Zustand 5 · TanStack Query 5
- **数据库**：SQLite（默认，开箱即用）→ PostgreSQL（生产，平滑切换）
- **部署**：Docker Compose · Nginx 反向代理

## 🚀 快速开始

### 方式一：一键启动（开发模式）
```bash
./dev.sh
# 前端: http://localhost:5173
# 后端: http://localhost:8000/docs
```

### 方式二：手动启动
```bash
# 后端
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 前端（另开终端）
cd frontend
npm install
npm run dev
```

### 方式三：Docker Compose（生产部署）
```bash
docker compose up --build
# 前端: http://localhost
# 后端: http://localhost:8000
```

> 首次启动会自动创建数据库表并播种 15 个成就目录，零配置即可运行。

## 📁 项目结构

```
LearnFlow/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口 + CORS + 路由注册 + 启动 seeding
│   │   ├── config.py            # 环境变量配置
│   │   ├── database.py          # SQLAlchemy 引擎 + 会话
│   │   ├── security.py          # bcrypt 密码哈希 + JWT
│   │   ├── deps.py              # 认证依赖
│   │   ├── models.py            # 22 张 ORM 表
│   │   ├── schemas.py           # Pydantic v2 请求/响应模型
│   │   ├── engines/             # 五大学习方法论引擎
│   │   │   ├── deliberate_practice.py   # SM-2 + IRT 3PL
│   │   │   ├── sponge_reading.py        # 三层笔记 + 四阶段
│   │   │   ├── deep_work.py             # 四策略 + 仪式
│   │   │   ├── knowledge_action.py      # 7 天行动 + 费曼
│   │   │   └── critical_thinking.py     # 11 步 + 谬误检测
│   │   ├── rewards/engine.py    # 跨学科奖励引擎 + 15 成就目录
│   │   ├── agent/               # AI Agent (Manager-Workers)
│   │   │   ├── manager.py       # 上下文构建 + 后端选择 + 降级
│   │   │   ├── llm_adapter.py   # OpenAI 兼容 LLM 适配器
│   │   │   └── rule_engine.py   # 6 角色规则引擎 (始终可用)
│   │   └── routers/             # 12 个 API 路由模块 (60 端点)
│   │       ├── auth.py  plans.py  focus.py  practice.py
│   │       ├── knowledge.py  reader.py  critical.py  action.py
│   │       ├── rewards.py  agent.py  analytics.py  social.py
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/                 # 类型化 API 客户端 + TS 类型
│   │   ├── store/authStore.ts   # Zustand 认证状态
│   │   ├── layouts/AppLayout.tsx # 侧边栏 + 顶栏布局
│   │   └── pages/               # 14 个页面
│   │       ├── Login.tsx  Dashboard.tsx  Plans.tsx  Focus.tsx
│   │       ├── Practice.tsx  KnowledgeGraph.tsx  Reading.tsx
│   │       ├── Critical.tsx  Action.tsx  Rewards.tsx
│   │       ├── Analytics.tsx  Agent.tsx  Social.tsx  Settings.tsx
│   ├── package.json
│   └── Dockerfile
├── documents/
│   └── learnflow-prd/           # 完整 PRD 文档 (13 章节)
├── docker-compose.yml
├── dev.sh
└── README.md
```

## 📡 API 概览

60 个 RESTful 端点，统一前缀 `/api/v1`，JWT Bearer 认证。

| 模块 | 端点示例 | 说明 |
|------|---------|------|
| 认证 | `POST /auth/register`, `POST /auth/login`, `GET /auth/me` | 注册/登录/资料 |
| 计划 | `GET /plans`, `POST /plans`, `PUT /plans/{id}` | 学习计划 + 里程碑 |
| 深度工作 | `POST /focus/start`, `POST /focus/{id}/complete` | 专注会话生命周期 |
| 刻意练习 | `GET /practice/items/due`, `POST /practice/attempts` | SM-2 复习队列 + 评分 |
| 知识图谱 | `GET /knowledge/graph`, `POST /knowledge/nodes` | 节点 + 关系 CRUD |
| 海绵阅读 | `GET /reader/books`, `POST /reader/notes` | 书籍 + 三层笔记 |
| 批判思维 | `POST /critical/analyze` | 11 步论证分析 |
| 知行转化 | `GET /action/plans`, `PUT /action/plans/{id}/items/{iid}` | 7 天行动 + 勾选 |
| 奖励 | `GET /rewards/balance`, `GET /rewards/leaderboard`, `POST /rewards/contracts` | 积分/成就/排行/期货 |
| Agent | `POST /agent/chat`, `GET /agent/conversations` | 多角色 AI 对话 |
| 分析 | `GET /analytics/dashboard`, `GET /analytics/weekly` | 仪表盘聚合 |
| 社区 | `GET /social/groups`, `POST /social/groups/join` | 学习小组 |

完整交互式文档：启动后端后访问 `http://localhost:8000/docs`。

## ⚙️ 配置

复制 `backend/.env.example` 为 `backend/.env` 并按需修改。关键配置：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `DATABASE_URL` | `sqlite:///./learnflow.db` | 数据库连接串 |
| `SECRET_KEY` | 开发密钥 | **生产环境必须修改** |
| `LLM_API_KEY` | 空 | 配置后启用 AI 大模型，否则用规则引擎 |
| `LLM_BASE_URL` | 空 | OpenAI 兼容端点 |
| `AGENT_BACKEND` | `auto` | `auto`/`rule`/`llm`/`hermes`/`openclaw`/`hiclaw` |

## 📖 方法论参考

本项目将以下经典学习书籍的方法论转化为可实操的软件功能：

- 《刻意练习》Anders Ericsson — SM-2 间隔重复 + 心智表征 + 学习区
- 《海绵阅读法》少楠 — 三层笔记法 + 四阶段阅读 + 知识内化
- 《深度工作》Cal Newport — 四种深度工作策略 + 注意力管理
- 《如何将知识转化为行动》— 7 天行动 + 绿灯思维 + 费曼输出
- 《学会提问》Browne & Keeley — 11 步批判性提问 + 谬误识别

## 📄 文档

- [完整 PRD（13 章节）](documents/learnflow-prd/learnflow-prd.html) — 产品需求文档
- API 交互文档 — `http://localhost:8000/docs`（启动后端后）

## 📜 License

MIT
