import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { resolve } from 'path';

const dbPath = resolve(import.meta.dirname, '..', '..', '..', 'data', 'vibe-station.db');
const sqlite = new Database(dbPath);
sqlite.pragma('journal_mode = WAL');

const db = drizzle(sqlite);

console.log(`Running migrations from: ${resolve(import.meta.dirname, '..', 'migrations')}`);
migrate(db, { migrationsFolder: resolve(import.meta.dirname, '..', 'migrations') });

console.log('Migrations complete.');
sqlite.close();
