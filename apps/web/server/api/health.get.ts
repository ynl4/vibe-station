/**
 * Health check endpoint (requires auth).
 * GET /api/health — returns 200 if DB is connected.
 */
export default defineEventHandler(async (event) => {
  const db = useDB();

  // Test: run a simple query
  const result = db.all<{ name: string }>(/* sql */`SELECT name FROM sqlite_master WHERE type='table'`);
  const tables = result.map(r => r.name);

  return {
    status: 'ok',
    tables,
  };
});
