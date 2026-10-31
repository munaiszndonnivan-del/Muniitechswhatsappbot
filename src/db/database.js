
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../'
);

const databasePath = path.resolve(
  projectRoot,
  process.env.DATABASE_PATH || './data/munaiszn-x.sqlite'
);

mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS command_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    command TEXT NOT NULL,
    sender TEXT NOT NULL,
    chat_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_command_usage_created
  ON command_usage(created_at);

  CREATE TABLE IF NOT EXISTS game_sessions (
    chat_id TEXT NOT NULL,
    sender TEXT NOT NULL,
    game TEXT NOT NULL,
    state_json TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, sender, game)
  );

  CREATE TABLE IF NOT EXISTS user_roles (
    jid TEXT PRIMARY KEY,
    role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
`);

const insertUsage = db.prepare(`
  INSERT INTO command_usage (command, sender, chat_id)
  VALUES (?, ?, ?)
`);

const getRoleStatement = db.prepare(`
  SELECT role FROM user_roles WHERE jid = ?
`);

const setRoleStatement = db.prepare(`
  INSERT INTO user_roles (jid, role)
  VALUES (?, ?)
  ON CONFLICT(jid) DO UPDATE SET
    role = excluded.role,
    updated_at = CURRENT_TIMESTAMP
`);

const deleteRoleStatement = db.prepare(`
  DELETE FROM user_roles WHERE jid = ?
`);

const saveGameStatement = db.prepare(`
  INSERT INTO game_sessions (chat_id, sender, game, state_json)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(chat_id, sender, game) DO UPDATE SET
    state_json = excluded.state_json,
    updated_at = CURRENT_TIMESTAMP
`);

const getGameStatement = db.prepare(`
  SELECT state_json FROM game_sessions
  WHERE chat_id = ? AND sender = ? AND game = ?
`);

const deleteGameStatement = db.prepare(`
  DELETE FROM game_sessions
  WHERE chat_id = ? AND sender = ? AND game = ?
`);

export function recordCommand(command, sender, chatId) {
  insertUsage.run(command, sender, chatId);
}

export function getUserRole(jid) {
  return getRoleStatement.get(jid)?.role ?? 'user';
}

export function setUserRole(jid, role) {
  if (!['user', 'admin'].includes(role)) {
    throw new Error('Role must be user or admin.');
  }

  setRoleStatement.run(jid, role);
}

export function removeUserRole(jid) {
  deleteRoleStatement.run(jid);
}

export function saveGame(chatId, sender, game, state) {
  saveGameStatement.run(
    chatId,
    sender,
    game,
    JSON.stringify(state)
  );
}

export function getGame(chatId, sender, game) {
  const row = getGameStatement.get(chatId, sender, game);

  if (!row) return null;

  try {
    return JSON.parse(row.state_json);
  } catch {
    return null;
  }
}

export function deleteGame(chatId, sender, game) {
  deleteGameStatement.run(chatId, sender, game);
}

export function getUsageSummary() {
  return db.prepare(`
    SELECT command, COUNT(*) AS uses
    FROM command_usage
    GROUP BY command
    ORDER BY uses DESC
    LIMIT 20
  `).all();
}

export function closeDatabase() {
  db.close();
}
