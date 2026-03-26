import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config';
import logger from '../logger';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(config.databasePath);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
  _db.exec(schema);

  logger.info({ databasePath: config.databasePath }, 'Database initialized');
  return _db;
}
