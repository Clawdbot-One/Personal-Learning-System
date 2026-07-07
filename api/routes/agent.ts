/**
 * AI Agent 路由 —— 融合五大学习方法的智能导师
 * 实现 Manager-Workers 架构：根据用户意图路由到对应的学习引擎 Agent
 * 五大引擎：刻意练习 / 海绵阅读 / 深度工作 / 知行转化 / 批判思维
 */
import { Router, type Request, type Response } from 'express'
import { db, uuid, parseJSON } from '../db.js'
import { authRequired } from '../utils/auth.js'
import { awardPoints, checkAchievements } from '../utils/rewards.js'

const router = Router()

/**
 * 五大学习方法论知识库 —— 每个引擎的核心方法论要点
 * 作为 Agent 的"专家知识"，用于生成有深度的回复
 */
const ENGINE_KNOWLEDGE: Record<string, { name: string; book: string; principles: string[]; methods: { name: string; detail: string }[] }> = {
  deliberate_practice: {
    name: '刻意练习引擎',
    book: '《刻意练习》Anders Ericsson',
    principles: [
      '心理表征是区分专家与新手的核心，通过高质量练习不断构建更精细的心理表征',
      '走出舒适区，在"学习区"边缘训练，挑战难度略高于当前能力',
      '即时反馈是刻意练习的灵魂，没有反馈的重复只是机械重复',
      '将复杂技能分解为可单独训练的子技能，逐项突破',
      '专注质量而非数量，1小时高质量练习胜过3小时走神练习',
    ],
    methods: [
      { name: '技能分解', detail: '将大目标拆解为最小可训练单元。例如学钢琴：先单手慢练，再双手合练，最后加速' },
      { name: '舒适区边缘', detail: '维持约85%成功率的最优难度。太简单会无聊，太难会焦虑，恰好略具挑战时进入心流' },
      { name: '即时反馈', detail: '每次练习后立即获取反馈。可以是导师点评、测试结果、或自我录像复盘' },
      { name: '心理表征构建', detail: '建立领域内高质量的心理模型。高手"看见"全局，新手只看见局部' },
    ],
  },
  sponge_reading: {
    name: '海绵阅读法引擎',
    book: '《海绵阅读法》李小墨',
    principles: [
      '三层笔记结构：第一层片段摘录，第二层章节归纳，第三层全书重构',
      '阅读七大能力：选书、速读、精读、记忆、输出、应用、复盘',
      '四阶段进阶：从被动吸收到主动建构，再到创造性输出',
      '阅读不是终点，输出才是知识内化的关键',
      '不同目的用不同阅读策略，避免所有书都逐字精读',
    ],
    methods: [
      { name: '三层笔记', detail: 'L1 摘录关键句 → L2 用自己话归纳章节主旨 → L3 绘制全书思维导图并写读后感' },
      { name: '选书能力', detail: '先看目录/序言/书评，判断是否值得读、该怎么读，避免在烂书上浪费时间' },
      { name: '速读+精读', detail: '快速浏览建立框架，再对核心章节精读。非所有内容都值得同等注意力' },
      { name: '费曼输出', detail: '读完后用最简单的语言向他人解释核心观点，讲不清楚就是没真懂' },
    ],
  },
  deep_work: {
    name: '深度工作引擎',
    book: '《深度工作》Cal Newport',
    principles: [
      '深度工作：在无干扰状态下专注进行认知挑战性任务，产生高价值产出',
      '注意力残留：任务切换会残留前任务注意力，严重削弱后续表现',
      '四种深度工作策略：禁欲式、双峰式、节奏式、记者式，因人而异选择',
      '仪式感：固定的时间、地点、流程让大脑快速进入深度状态',
      '拥抱无聊：不要时刻填满碎片时间，让大脑有放空恢复的机会',
    ],
    methods: [
      { name: '时间块规划', detail: '将一天划分为若干时间块，深度工作块单独保护，避免与浅层工作混杂' },
      { name: '节奏式策略', detail: '每天固定时段深度工作（如晨6-9点），形成习惯降低启动成本' },
      { name: '启动仪式', detail: '开始前做固定动作（泡咖啡、戴耳机、关通知），暗示大脑进入深度模式' },
      { name: '注意力保护', detail: '关闭所有通知，告知他人勿扰，使用番茄钟强制专注，记录干扰但不响应' },
    ],
  },
  knowledge_action: {
    name: '知行转化引擎',
    book: '《知行差距》Ken Blanchard',
    principles: [
      '知行差距三重枷锁：信息过载、消极过滤、缺乏跟进，是知道却做不到的根因',
      '精要主义：少而精，与其收藏100篇文章不如深度实践1篇',
      '绿灯思维：面对新想法先找它的可行之处，而非急于否定',
      '间隔重复跟进：学完不跟进等于没学，7天行动计划比一次性学习有效10倍',
      '教授他人是最深层的内化，教不会说明自己还没真正掌握',
    ],
    methods: [
      { name: '知行诊断', detail: '统计"收藏数 vs 实践数"比值，比值越高说明知行断裂越严重' },
      { name: '7天行动计划', detail: '学完一个知识点，立即制定未来7天每天1个微小行动，逐步内化' },
      { name: '绿灯评估', detail: '听到新观点先问"这有什么用？"（绿灯），再问"有什么问题？"（红灯）' },
      { name: '费曼教授', detail: '假设要向小学生讲解这个知识，用最简单的话说出来，卡壳处就是知识盲区' },
    ],
  },
  critical_thinking: {
    name: '批判性思维引擎',
    book: '《学会提问》M. Neil Browne',
    principles: [
      '海绵式思维（全盘吸收）vs 淘金式思维（主动提问筛选），后者才能形成独立判断',
      '11步批判性思维清单：从论题→结论→理由→歧义词→假设→谬误→证据→竞争原因→数据→遗漏→多结论',
      '警惕常见逻辑谬误：诉诸权威、滑坡谬误、稻草人、人身攻击、虚假两难',
      '证据分级：系统综述 > RCT > 队列研究 > 案例报告 > 个人经验 > 专家意见',
      '挖掘隐藏假设：每个论证背后都有未明说的前提，找到它才能判断论证是否成立',
    ],
    methods: [
      { name: '论证分析', detail: '结构化拆解：结论是什么？支撑理由有哪些？理由是否真的支撑结论？' },
      { name: '谬误检测', detail: '读到强观点时主动问：这是否在诉诸情感？是否以偏概全？是否混淆因果？' },
      { name: '证据评估', detail: '这个证据来自哪？是个人经验还是系统研究？样本量够吗？有无利益冲突？' },
      { name: '假设挖掘', detail: '追问"要让这个论证成立，必须假设什么前提？"这些前提是否站得住脚？' },
    ],
  },
}

/**
 * 意图识别 —— 根据用户消息关键词路由到对应引擎
 */
function detectEngine(message: string): string {
  const msg = message.toLowerCase()
  if (/(练习|技能|训练|掌握|学会|提高|提升|难度|反馈|进步)/.test(msg)) return 'deliberate_practice'
  if (/(读书|阅读|笔记|书|摘录|归纳|速读|精读|费曼)/.test(msg)) return 'sponge_reading'
  if (/(专注|深度工作|番茄|干扰|分心|时间块|注意力|心流|仪式)/.test(msg)) return 'deep_work'
  if (/(行动|实践|执行|落地|知行|做到|应用|习惯)/.test(msg)) return 'knowledge_action'
  if (/(批判|质疑|论证|谬误|逻辑|证据|假设|提问|说服|观点)/.test(msg)) return 'critical_thinking'
  return ''
}

/**
 * 生成 Agent 回复 —— 基于意图与上下文的规则引擎
 */
function generateReply(userMessage: string, userId: string): { content: string; engine: string } {
  const engine = detectEngine(userMessage)

  // 通用问候/帮助
  if (/(你好|hi|hello|帮助|help|你能做什么|功能)/i.test(userMessage)) {
    return {
      content: `你好！我是你的 LearnFlow 学习导师，融合了五大经典学习方法论：

**1. 刻意练习引擎**（源自《刻意练习》）—— 帮你分解技能、找到学习区、获得即时反馈
**2. 海绵阅读法引擎**（源自《海绵阅读法》）—— 三层笔记、阅读能力诊断、高效内化
**3. 深度工作引擎**（源自《深度工作》）—— 专注保护、时间块规划、仪式感设计
**4. 知行转化引擎**（源自《知行差距》）—— 知行诊断、7天行动计划、费曼输出
**5. 批判性思维引擎**（源自《学会提问》）—— 论证分析、谬误检测、证据评估

你可以这样问我：
- "如何高效练习钢琴/编程/英语？"
- "怎么读书才能记住？"
- "如何保持长时间专注？"
- "学了总是做不到怎么办？"
- "帮我分析这段话的逻辑是否成立"

我会调用对应的学习方法论引擎为你提供专业建议。`,
      engine: '',
    }
  }

  // 计划/目标相关
  if (/(计划|目标|规划|安排|怎么学|学习路径)/.test(userMessage)) {
    const plans = db.prepare(`SELECT title, progress, status FROM learning_plans WHERE user_id = ? AND status = 'active'`).all(userId) as { title: string; progress: number; status: string }[]
    let content = `基于**刻意练习引擎**的方法论，我建议你这样规划学习：\n\n`
    content += `**核心原则：技能分解 + 舒适区边缘训练**\n\n`
    content += `1. **明确目标技能**：把"学好X"拆成可衡量的子技能\n2. **评估当前水平**：找到你的"学习区"（85%成功率难度）\n3. **设计训练单元**：每个单元聚焦一个子技能，15-45分钟\n4. **建立反馈闭环**：每次练习后立即获取反馈（测试/复盘/导师）\n5. **间隔重复**：用艾宾浩斯曲线安排复习，对抗遗忘\n\n`
    if (plans.length > 0) {
      content += `你当前有 ${plans.length} 个进行中的计划：\n`
      plans.forEach((p) => { content += `- ${p.title}（进度 ${p.progress}%）\n` })
      content += `\n建议优先聚焦1个计划，避免注意力分散。`
    } else {
      content += `建议先到"学习计划"页面创建你的第一个学习目标，我会自动帮你拆解里程碑。`
    }
    return { content, engine: 'deliberate_practice' }
  }

  // 命中具体引擎
  if (engine && ENGINE_KNOWLEDGE[engine]) {
    const k = ENGINE_KNOWLEDGE[engine]
    let content = `**${k.name}** · 源自${k.book}\n\n`
    content += `根据你的问题，我从这套方法论中为你提炼要点：\n\n`
    content += `**核心原理：**\n`
    k.principles.forEach((p, i) => { content += `${i + 1}. ${p}\n` })
    content += `\n**实操方法：**\n`
    k.methods.forEach((m) => { content += `▸ **${m.name}**：${m.detail}\n` })
    content += `\n💡 建议你选择其中一个方法，在未来7天内每天实践一小步——这正是"知行转化引擎"强调的跟进式学习。`
    return { content, engine }
  }

  // 兜底回复
  return {
    content: `我理解你的问题了。作为融合五大学习方法论的导师，我建议从以下角度思考：

**从刻意练习看**：这个问题涉及哪些可训练的子技能？你的当前水平在哪个阶段？
**从深度工作看**：解决这个问题需要多少专注时间？如何屏蔽干扰？
**从知行转化看**：你已有的知识中，哪些还没有转化为行动？阻碍是什么？
**从批判思维看**：你对这个问题的理解，是否有未经验证的假设？

请告诉我更具体的情境，我可以调用对应的学习方法论引擎给你更精准的指导。`,
    engine: '',
  }
}

/**
 * GET /api/agent/messages —— 获取对话历史
 */
router.get('/messages', authRequired, (req: Request, res: Response): void => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const rows = db.prepare(`SELECT * FROM agent_messages WHERE user_id = ? ORDER BY created_at ASC LIMIT ?`).all(req.userId, limit) as Record<string, unknown>[]
  res.json({
    success: true,
    data: rows.map((r) => ({ ...r, metadata: parseJSON(r.metadata, {}) })),
  })
})

/**
 * POST /api/agent/chat —— 与 Agent 对话
 */
router.post('/chat', authRequired, (req: Request, res: Response): void => {
  const { message } = req.body ?? {}
  if (!message || !message.trim()) {
    res.status(400).json({ success: false, error: '消息内容不能为空' })
    return
  }

  // 保存用户消息
  db.prepare(`INSERT INTO agent_messages (id, user_id, role, content, engine_type) VALUES (?, ?, 'user', ?, '')`)
    .run(uuid(), req.userId, message)

  // 生成回复
  const { content, engine } = generateReply(message, req.userId!)

  // 保存 Agent 回复
  const replyId = uuid()
  db.prepare(`INSERT INTO agent_messages (id, user_id, role, content, engine_type, metadata) VALUES (?, ?, 'assistant', ?, ?, '{}')`)
    .run(replyId, req.userId, content, engine)

  // 对话奖励
  const reward = awardPoints(req.userId!, 'agent_chat', '与学习导师对话')
  checkAchievements(req.userId!)

  res.json({
    success: true,
    data: {
      id: replyId,
      role: 'assistant',
      content,
      engine_type: engine,
      created_at: new Date().toISOString(),
    },
    reward,
  })
})

/**
 * GET /api/agent/engines —— 获取五大引擎介绍
 */
router.get('/engines', (_req: Request, res: Response): void => {
  res.json({ success: true, data: ENGINE_KNOWLEDGE })
})

export default router
