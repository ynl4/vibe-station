import { createDeepSeekProvider, createSSEResponse } from '@vibe/ai-core';
import type { ChatChunk } from '@vibe/ai-core';
import { chatSessions, chatMessages } from '@vibe/db/schema';
import { eq, asc } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const body = await readBody(event);

  const { sessionId, message } = body;
  if (!message?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Message is required' });
  }

  // Get or create session
  let sid = sessionId;
  if (!sid) {
    const title = message.slice(0, 60) + (message.length > 60 ? '...' : '');
    const session = db.insert(chatSessions).values({ title }).returning().get();
    sid = session.id;
  }

  // Save user message
  db.insert(chatMessages).values({
    sessionId: sid,
    role: 'user',
    content: message,
    createdAt: new Date(),
  }).run();

  // Load conversation history (last 20 messages)
  const history = db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sid))
    .orderBy(asc(chatMessages.createdAt))
    .all();

  const recentMessages = history
    .slice(-20)
    .map((m: any) => ({ role: m.role, content: m.content }));

  // Stream response
  const provider = createDeepSeekProvider({
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const startTime = Date.now();
  let fullContent = '';

  async function* streamChat(): AsyncGenerator<ChatChunk> {
    try {
      for await (const chunk of provider.chat({
        messages: recentMessages,
        model: 'deepseek-chat',
        provider: 'deepseek',
        stream: true,
      })) {
        fullContent += chunk.content;
        yield chunk;
      }

      // Save assistant message
      db.insert(chatMessages).values({
        sessionId: sid,
        role: 'assistant',
        content: fullContent,
        model: 'deepseek-chat',
        provider: 'cloud',
        latencyMs: Date.now() - startTime,
        createdAt: new Date(),
      }).run();
    } catch (e: any) {
      // Save error as assistant message
      if (fullContent) {
        db.insert(chatMessages).values({
          sessionId: sid,
          role: 'assistant',
          content: fullContent + '\n\n[Error: ' + e.message + ']',
          model: 'deepseek-chat',
          provider: 'cloud',
          latencyMs: Date.now() - startTime,
          createdAt: new Date(),
        }).run();
      }
      throw e;
    }
  }

  // Return sessionId in first chunk for the client
  const inner = streamChat();
  async function* withSessionId(): AsyncGenerator<ChatChunk> {
    yield { content: '', done: false, sessionId: sid } as any;
    yield* inner;
  }

  return createSSEResponse(withSessionId());
});
