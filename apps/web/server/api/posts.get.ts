import { posts } from '@vibe/db/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const slug = query.slug as string | undefined;

  if (slug) {
    const result = db.select().from(posts).where(eq(posts.slug, slug)).get();
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Post not found' });
    }
    return result;
  }

  return db.select().from(posts).orderBy(desc(posts.createdAt)).all();
});
