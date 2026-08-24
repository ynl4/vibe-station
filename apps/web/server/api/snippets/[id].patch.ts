import { snippets } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';
import { embedSnippet, serializeEmbedding } from '../../utils/embedding';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);
  const body = await readBody(event);

  const existing = db.select().from(snippets).where(eq(snippets.id, id)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' });
  }

  const result = db.update(snippets)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.code !== undefined && { code: body.code }),
      ...(body.language !== undefined && { language: body.language }),
      ...(body.explanation !== undefined && { explanation: body.explanation }),
      ...(body.tags !== undefined && { tags: body.tags }),
    })
    .where(eq(snippets.id, id))
    .returning()
    .get();

  // Regenerate embedding when content-relevant fields change.
  // Updating only the explanation does NOT trigger re-embedding.
  const contentChanged = ['title', 'description', 'code', 'tags'].some(
    (k) => body[k] !== undefined,
  );
  if (contentChanged && process.env.DEEPSEEK_API_KEY) {
    const merged = { ...existing, ...body };
    embedSnippet({
      title: merged.title,
      description: merged.description,
      code: merged.code,
      tags: merged.tags || [],
    })
      .then((vec) => {
        db.update(snippets)
          .set({ embedding: serializeEmbedding(vec) } as any)
          .where(eq(snippets.id, id))
          .run();
        console.log('[embedding] Regenerated for snippet #' + id);
      })
      .catch((err) => console.error('[embedding] Failed to update snippet #' + id + ':', err.message));
  }

  return result;
});
