import { posts } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const slug = getRouterParam(event, 'slug')!;
  const body = await readBody(event);

  const existing = db.select().from(posts).where(eq(posts.slug, slug)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Post not found' });
  }

  const result = db.update(posts)
    .set({
      ...(body.title && { title: body.title }),
      ...(body.content && { content: body.content }),
      ...(body.tags && { tags: body.tags }),
      updatedAt: new Date(),
    })
    .where(eq(posts.slug, slug))
    .returning()
    .get();

  return result;
});
