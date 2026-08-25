import { snippets } from '@vibe/db/schema';
import { isNull, eq } from 'drizzle-orm';
import { embedSnippet, serializeEmbedding } from '../../utils/embedding';

/**
 * One-shot backfill: generates embeddings for all snippets that don't have one.
 * POST /api/snippets/backfill
 */
export default defineEventHandler(async (_event) => {
  const db = useDB();

  if (!process.env.DEEPSEEK_API_KEY) {
    throw createError({ statusCode: 400, statusMessage: 'DEEPSEEK_API_KEY not configured' });
  }

  const withoutEmbedding = db
    .select()
    .from(snippets)
    .where(isNull(snippets.embedding))
    .all();

  let processed = 0;
  let failed = 0;

  for (const s of withoutEmbedding) {
    try {
      const vec = await embedSnippet({
        title: s.title,
        description: s.description,
        code: s.code,
        tags: s.tags || [],
      });
      db.update(snippets)
        .set({ embedding: serializeEmbedding(vec) } as any)
        .where(eq(snippets.id, s.id))
        .run();
      processed++;
    } catch (e: any) {
      console.error(`[backfill] Failed to embed snippet #${s.id}:`, e.message);
      failed++;
    }
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  return { total: withoutEmbedding.length, processed, failed };
});
