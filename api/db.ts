/**
 * LearnFlow 数据库模块
 * 基于 SQLite (better-sqlite3) 实现持久化存储
 * 包含用户、学习计划、学习会话、知识图谱、奖励、成就等核心数据模型
 */
import Database from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 数据库文件存放于项目根目录 data 文件夹
const dataDir = path.resolve(__dirname, '..', 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

const dbPath = path.join(dataDir, 'learnflow.db')
const db = new Database(dbPath)

// 开启 WAL 模式提升并发性能
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

/**
 * 初始化数据库 Schema
 */
export function initDB() {
  db.exec(`
    -- ==================== 用户表 ====================
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      avatar TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      preferences TEXT DEFAULT '{}',
      points INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      streak_days INTEGER DEFAULT 0,
      last_active_date TEXT,
      total_focus_minutes INTEGER DEFAULT 0,
      total_sessions INTEGER DEFAULT 0,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    -- ==================== 学习计划表 ====================
    CREATE TABLE IF NOT EXISTS learning_plans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      category TEXT DEFAULT 'general',
      target_skills TEXT DEFAULT '[]',
      engines TEXT DEFAULT '[]',
      deadline TEXT,
      progress REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== 计划里程碑 ====================
    CREATE TABLE IF NOT EXISTS plan_milestones (
      id TEXT PRIMARY KEY,
      plan_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      completed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE CASCADE
    );

    -- ==================== 学习会话记录 ====================
    CREATE TABLE IF NOT EXISTS learning_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      plan_id TEXT,
      engine_type TEXT NOT NULL,
      title TEXT DEFAULT '',
      duration_minutes INTEGER DEFAULT 0,
      focus_minutes INTEGER DEFAULT 0,
      difficulty REAL DEFAULT 0.5,
      performance_score REAL DEFAULT 0,
      session_data TEXT DEFAULT '{}',
      notes TEXT DEFAULT '',
      started_at TEXT DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (plan_id) REFERENCES learning_plans(id) ON DELETE SET NULL
    );

    -- ==================== 知识节点 ====================
    CREATE TABLE IF NOT EXISTS knowledge_nodes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      concept TEXT NOT NULL,
      description TEXT DEFAULT '',
      category TEXT DEFAULT 'general',
      mastery_level REAL DEFAULT 0,
      importance REAL DEFAULT 0.5,
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== 知识关系 ====================
    CREATE TABLE IF NOT EXISTS knowledge_relations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      target_id TEXT NOT NULL,
      relation_type TEXT DEFAULT 'related',
      strength REAL DEFAULT 0.5,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (source_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
    );

    -- ==================== 奖励流水账本 ====================
    CREATE TABLE IF NOT EXISTS rewards_ledger (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== 成就解锁记录 ====================
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      badge_id TEXT NOT NULL,
      earned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE (user_id, badge_id)
    );

    -- ==================== Agent 对话记录 ====================
    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      engine_type TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== 阅读笔记 (海绵阅读法三层结构) ====================
    CREATE TABLE IF NOT EXISTS reading_notes (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      book_title TEXT DEFAULT '',
      layer INTEGER DEFAULT 1,
      fragment TEXT NOT NULL,
      insight TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ==================== 索引 ====================
    CREATE INDEX IF NOT EXISTS idx_plans_user ON learning_plans(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_user ON learning_sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_started ON learning_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_nodes_user ON knowledge_nodes(user_id);
    CREATE INDEX IF NOT EXISTS idx_relations_user ON knowledge_relations(user_id);
    CREATE INDEX IF NOT EXISTS idx_rewards_user ON rewards_ledger(user_id);
    CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
    CREATE INDEX IF NOT EXISTS idx_messages_user ON agent_messages(user_id);
    CREATE INDEX IF NOT EXISTS idx_notes_user ON reading_notes(user_id);
  `)
}

/**
 * 生成 UUID (无需外部依赖)
 */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * JSON 字段安全解析
 */
export function parseJSON<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export { db }
