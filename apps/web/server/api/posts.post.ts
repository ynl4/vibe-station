import { posts } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.title || !body.content) {
    throw createError({ statusCode: 400, statusMessage: 'Title and content are required' });
  }

  // Generate slug from title
  const slug = body.slug || body.title
    .toLowerCase()
    .replace(/[^\w一-龥]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  // Check slug uniqueness
  const existing = db.select({ id: posts.id }).from(posts).where(eq(posts.slug, slug)).get();
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Slug already exists' });
  }

  const result = db.insert(posts).values({
    slug,
    title: body.title,
    content: body.content,
    tags: body.tags || [],
  }).returning().get();

  return result;
});
