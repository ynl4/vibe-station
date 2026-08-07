import { snippets } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

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

  return result;
});
