import { snippets } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';
import { embedSnippet, serializeEmbedding } from '../utils/embedding';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.title || !body.code || !body.language) {
    throw createError({ statusCode: 400, statusMessage: 'Title, code, and language are required' });
  }

  const result = db.insert(snippets).values({
    title: body.title,
    description: body.description || null,
    code: body.code,
    language: body.language,
    explanation: body.explanation || null,
    tags: body.tags || [],
  }).returning().get();

  // Best-effort embedding generation (fire-and-forget — don't block the response)
  if (process.env.DEEPSEEK_API_KEY) {
    embedSnippet({ title: body.title, description: body.description, code: body.code, tags: body.tags || [] })
      .then((vec) => {
        db.update(snippets)
          .set({ embedding: serializeEmbedding(vec) } as any)
          .where(eq(snippets.id, result.id))
          .run();
        console.log('[embedding] Generated for snippet #' + result.id);
      })
      .catch((err) => console.error('[embedding] Failed for new snippet #' + result.id + ':', err.message));
  }

  return result;
});
