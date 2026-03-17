import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement> | null = null;

export async function getDb() {
  if (db) {
    return db;
  }

  // Tauri 打包后，Rust 层会注入 DATABASE_PATH 指向系统 AppData 目录
  // 开发时 fallback 到 process.cwd()/database.sqlite
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(process.cwd(), 'database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Initialize schema
  await db.exec(`
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
  `);

  // Migrate existing tasks table: add created_at if column not exists
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN created_at TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN reminder_time TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN reminder_type TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN bot_id TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN is_reminded BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN bot_mentions TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN bot_mention_all BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN bot_custom_message TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN is_pinned BOOLEAN NOT NULL DEFAULT 0`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN tag_text TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE tasks ADD COLUMN tag_color TEXT`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE reports ADD COLUMN report_type TEXT NOT NULL DEFAULT 'daily'`);
  } catch (err) {}
  try {
    await db.run(`ALTER TABLE reports ADD COLUMN report_date TEXT NOT NULL DEFAULT ''`);
  } catch (err) {}

  return db;
}
