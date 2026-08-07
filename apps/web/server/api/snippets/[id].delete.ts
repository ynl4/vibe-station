import { snippets } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);

  const existing = db.select({ id: snippets.id }).from(snippets).where(eq(snippets.id, id)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Snippet not found' });
  }

  db.delete(snippets).where(eq(snippets.id, id)).run();
  return { success: true };
});
