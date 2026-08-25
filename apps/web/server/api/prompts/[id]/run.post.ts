import { createDeepSeekProvider, createSSEResponse } from '@vibe/ai-core';
import type { ChatChunk } from '@vibe/ai-core';
import { prompts, promptRuns } from '@vibe/db/schema';
import { eq } from 'drizzle-orm';

// Regex for {{variable}} with Chinese support
const VAR_RE = /\{\{\s*([\w一-鿿]+)\s*\}\}/g;

export default defineEventHandler(async (event) => {
  const db = useDB();
  const id = parseInt(getRouterParam(event, 'id')!);
  const body = await readBody(event);

  const prompt = db.select().from(prompts).where(eq(prompts.id, id)).get();
  if (!prompt) {
    throw createError({ statusCode: 404, statusMessage: 'Prompt not found' });
  }

  // Extract variables from template
  const vars = extractVariables(prompt.template);
  const provided = body.variables || {};

  // Strict validation: all variables must be filled
  const missing = vars.filter(v => !provided[v]?.trim());
  if (missing.length > 0) {
    throw createError({
      statusCode: 422,
      statusMessage: `Missing variables: ${missing.join(', ')}`,
    });
  }

  // Render template
  let rendered = prompt.template;
  for (const v of vars) {
    rendered = rendered.replace(new RegExp(`\\{\\{\\s*${escapeRegex(v)}\\s*\\}\\}`, 'g'), provided[v]);
  }

  // Update use count
  db.update(prompts)
    .set({ useCount: (prompt.useCount || 0) + 1, updatedAt: new Date() })
    .where(eq(prompts.id, id))
    .run();

  const provider = createDeepSeekProvider({
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  const startTime = Date.now();
  let fullOutput = '';
  let hasError = false;
  let errorMsg = '';

  async function* streamRun(): AsyncGenerator<ChatChunk> {
    try {
      for await (const chunk of provider.chat({
        messages: [{ role: 'user', content: rendered }],
        model: 'deepseek-chat',
        provider: 'deepseek',
        stream: true,
      })) {
        fullOutput += chunk.content;
        yield chunk;
      }
    } catch (e: any) {
      hasError = true;
      errorMsg = e.message;
      fullOutput += `\n\n[Error: ${e.message}]`;
    }
  }

  // Wrap to save run record after streaming
  const inner = streamRun();
  let saved = false;

  async function* withRecord(): AsyncGenerator<ChatChunk> {
    yield* inner;

    // Save run record
    db.insert(promptRuns).values({
      promptId: id,
      variables: provided,
      model: 'deepseek-chat',
      provider: 'cloud',
      output: fullOutput.slice(0, 10000), // truncate long outputs
      outputTokenCount: Math.ceil(fullOutput.length / 4), // rough estimate
      outputTruncated: fullOutput.length > 10000 ? 1 : 0,
      latencyMs: Date.now() - startTime,
      status: hasError ? 'error' : 'success',
      createdAt: new Date(),
    }).run();

    saved = true;
  }

  return createSSEResponse(withRecord());
});

function extractVariables(template: string): string[] {
  const vars = new Set<string>();
  let match;
  while ((match = VAR_RE.exec(template)) !== null) {
    vars.add(match[1].trim());
  }
  return [...vars];
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
