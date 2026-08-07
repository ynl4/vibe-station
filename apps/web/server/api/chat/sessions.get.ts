import { chatSessions } from '@vibe/db/schema';
import { desc } from 'drizzle-orm';

export default defineEventHandler(async () => {
  const db = useDB();
  return db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt)).all();
});
