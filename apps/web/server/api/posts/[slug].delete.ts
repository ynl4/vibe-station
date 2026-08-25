import { posts } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const slug = getRouterParam(event, 'slug')!;

  const existing = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  db.delete(posts).where(eq(posts.slug, slug)).run();
  return { success: true };
});
