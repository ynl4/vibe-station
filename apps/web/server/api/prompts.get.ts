import { prompts } from '@vibe/db/schema';
import { desc, eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const category = query.category as string | undefined;

  if (category) {
    return db.select().from(prompts).where(eq(prompts.category, category)).orderBy(desc(prompts.updatedAt)).all();
  }

  return db.select().from(prompts).orderBy(desc(prompts.updatedAt)).all();
});
