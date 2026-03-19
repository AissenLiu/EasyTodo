import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

async function ensureSchema(currentDb: Database<sqlite3.Database, sqlite3.Statement>) {
  await currentDb.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      tasks TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      completed BOOLEAN NOT NULL DEFAULT 0,
      date TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT '',
      reminder_time TEXT,
      reminder_type TEXT,
      bot_id TEXT,
      is_reminded BOOLEAN NOT NULL DEFAULT 0,
      bot_mentions TEXT,
      bot_mention_all BOOLEAN NOT NULL DEFAULT 0,
      bot_custom_message TEXT,
      is_pinned BOOLEAN NOT NULL DEFAULT 0,
      tag_text TEXT,
      tag_color TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY,
      api_base TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
      api_key TEXT NOT NULL DEFAULT '',
      model TEXT NOT NULL DEFAULT 'gpt-4o'
    );

    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      report_type TEXT NOT NULL DEFAULT 'daily',
      report_date TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bots (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      webhook TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS countdowns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      display_unit TEXT NOT NULL DEFAULT 'day',
      mode TEXT NOT NULL DEFAULT 'absolute',
      target_at TEXT,
      cycle_type TEXT,
      cycle_value TEXT,
      time_of_day TEXT,
      is_active BOOLEAN NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pomodoro_settings (
      id INTEGER PRIMARY KEY,
      work_minutes INTEGER NOT NULL DEFAULT 25,
      short_break_minutes INTEGER NOT NULL DEFAULT 5,
      long_break_minutes INTEGER NOT NULL DEFAULT 15,
      long_break_interval INTEGER NOT NULL DEFAULT 4,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      session_type TEXT NOT NULL,
      planned_minutes INTEGER NOT NULL DEFAULT 25,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      status TEXT NOT NULL DEFAULT 'completed'
    );

    CREATE TABLE IF NOT EXISTS clipboard_history (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS memos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '未命名备忘录',
      content TEXT NOT NULL DEFAULT '',
      category TEXT,
      is_pinned BOOLEAN NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await currentDb.run(`
    INSERT OR IGNORE INTO pomodoro_settings (
      id,
      work_minutes,
      short_break_minutes,
      long_break_minutes,
      long_break_interval
    )
    VALUES (1, 25, 5, 15, 4)
  `);

  // Migrate existing tasks table: add created_at if column not exists
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN reminder_time TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN reminder_type TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN bot_id TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN is_reminded BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN bot_mentions TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN bot_mention_all BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN bot_custom_message TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN tag_text TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE tasks ADD COLUMN tag_color TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE reports ADD COLUMN report_type TEXT NOT NULL DEFAULT 'daily'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE reports ADD COLUMN report_date TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN description TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN display_unit TEXT NOT NULL DEFAULT 'day'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN mode TEXT NOT NULL DEFAULT 'absolute'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN target_at TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN cycle_type TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN cycle_value TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN time_of_day TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT 1`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE countdowns ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_settings ADD COLUMN work_minutes INTEGER NOT NULL DEFAULT 25`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_settings ADD COLUMN short_break_minutes INTEGER NOT NULL DEFAULT 5`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_settings ADD COLUMN long_break_minutes INTEGER NOT NULL DEFAULT 15`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_settings ADD COLUMN long_break_interval INTEGER NOT NULL DEFAULT 4`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_settings ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_sessions ADD COLUMN planned_minutes INTEGER NOT NULL DEFAULT 25`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_sessions ADD COLUMN ended_at TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE pomodoro_sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE clipboard_history ADD COLUMN content_hash TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE clipboard_history ADD COLUMN source TEXT NOT NULL DEFAULT 'system'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE clipboard_history ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN title TEXT NOT NULL DEFAULT '未命名备忘录'`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN content TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN category TEXT`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}
  try {
    await currentDb.run(`ALTER TABLE memos ADD COLUMN updated_at TEXT NOT NULL DEFAULT (datetime('now'))`);
  } catch (err) {}

  await currentDb.exec(`
    CREATE INDEX IF NOT EXISTS idx_countdowns_active ON countdowns(is_active, updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON pomodoro_sessions(started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clipboard_history_created_at ON clipboard_history(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_clipboard_history_hash ON clipboard_history(content_hash);
    CREATE INDEX IF NOT EXISTS idx_memos_updated_at ON memos(updated_at DESC);
    CREATE INDEX IF NOT EXISTS idx_memos_pinned_updated ON memos(is_pinned DESC, updated_at DESC);
  `);
}

export async function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.join(process.cwd(), 'database.sqlite');

    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }

  await ensureSchema(db);
  return db;
}
