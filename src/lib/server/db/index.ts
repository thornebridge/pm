import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { env } from '$env/dynamic/private';
import path from 'node:path';
import fs from 'node:fs';

const dbPath = env.DATABASE_URL || './data/pm.db';
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle(sqlite, { schema });

// Auto-run migrations on startup
const migrationsDir = path.resolve('drizzle');
if (fs.existsSync(migrationsDir)) {
	migrate(db, { migrationsFolder: migrationsDir });
}
