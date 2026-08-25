import { prompts } from '@vibe/db/schema';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  if (!body.title || !body.template) {
    throw createError({ statusCode: 400, statusMessage: 'Title and template are required' });
  }

  const result = db.insert(prompts).values({
    title: body.title,
    description: body.description || null,
    template: body.template,
    category: body.category || 'coding',
    tags: body.tags || [],
  }).returning().get();

  return result;
});
