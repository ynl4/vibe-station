import { promptRuns } from '@vibe/db/schema';
import { eq, desc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);

  return db
    .select()
    .from(promptRuns)
    .where(eq(promptRuns.promptId, id))
    .orderBy(desc(promptRuns.createdAt))
    .limit(10)
    .all();
});
