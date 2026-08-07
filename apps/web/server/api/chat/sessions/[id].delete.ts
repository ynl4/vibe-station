import { chatSessions, chatMessages } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);

  db.delete(chatMessages).where(eq(chatMessages.sessionId, id)).run();
  db.delete(chatSessions).where(eq(chatSessions.id, id)).run();

  return { success: true };
});
