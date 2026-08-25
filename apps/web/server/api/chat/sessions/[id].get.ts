import { chatSessions, chatMessages } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);

  const session = db.select().from(chatSessions).where(eq(chatSessions.id, id)).get();
  if (!session) {
    throw createError({ statusCode: 404, statusMessage: 'Session not found' });
  }

  const messages = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .all();

  return { session, messages };
});
