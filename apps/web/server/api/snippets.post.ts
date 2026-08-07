import { snippets } from '@vibe/db/schema';

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

  return result;
});
