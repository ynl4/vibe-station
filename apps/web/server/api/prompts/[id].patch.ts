import { prompts } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);
  const body = await readBody(event);

  const existing = db.select().from(prompts).where(eq(prompts.id, id)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt not found' });
  }

  const result = db.update(prompts)
    .set({
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.template !== undefined && { template: body.template }),
      ...(body.category !== undefined && { category: body.category }),
      ...(body.tags !== undefined && { tags: body.tags }),
      updatedAt: new Date(),
    })
    .where(eq(prompts.id, id))
    .returning()
    .get();

  return result;
});
