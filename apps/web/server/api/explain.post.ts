import { createDeepSeekProvider } from '@vibe/ai-core';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { code, language } = body;

  if (!code?.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'Code is required' });
  }

  const prompt = `You are a code explainer. Explain the following ${language || ''} code in Chinese. Use this 3-section format:

## 用途
What does this code do? Explain in 1-2 sentences.

## 关键点
List 2-4 key technical points or patterns used.

## 注意事项
Any caveats, edge cases, or potential issues to watch for.

Code:
\`\`\`${language || ''}
${code}
\`\`\``;

  const provider = createDeepSeekProvider({
    model: 'deepseek-chat',
    apiKey: process.env.DEEPSEEK_API_KEY,
  });

  let result = '';
  try {
    for await (const chunk of provider.chat({
      messages: [{ role: 'user', content: prompt }],
      model: 'deepseek-chat',
      provider: 'deepseek',
    })) {
      result += chunk.content;
    }
  } catch (e: any) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI explanation failed',
      message: e.message,
    });
  }

  return { explanation: result };
});
