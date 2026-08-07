import { prompts, promptRuns } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);

  const existing = db.select({ id: prompts.id }).from(prompts).where(eq(prompts.id, id)).get();
  if (!existing) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt not found' });
  }

  // Cascade delete runs
  db.delete(promptRuns).where(eq(promptRuns.promptId, id)).run();
  db.delete(prompts).where(eq(prompts.id, id)).run();

  return { success: true };
});
