import { createDatabase } from '@vibe/db';
import { resolve } from 'path';

let _db: ReturnType<typeof createDatabase> | null = null;

/**
 * Get or create the database instance (singleton).
 * Path is relative to the Nuxt project root (apps/web/).
 */
export function useDB() {
  if (!_db) {
    // In dev: project root is apps/web/, DB is at ../../data/
    // In production: project root is .output/, but we use env var
    const dbPath = process.env.DB_PATH || resolve(process.cwd(), '../../data/vibe-station.db');
    _db = createDatabase(dbPath);
  }
  return _db;
}
