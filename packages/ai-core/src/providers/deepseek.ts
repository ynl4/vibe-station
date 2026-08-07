import type { ChatRequest, ChatChunk, AIProviderConfig } from '../types';

/**
 * DeepSeek cloud AI provider (OpenAI-compatible API).
 */
export function createDeepSeekProvider(config: AIProviderConfig) {
  const baseUrl = config.baseUrl || 'https://api.deepseek.com';
  const apiKey = config.apiKey || process.env.DEEPSEEK_API_KEY || '';

  return {
    async *chat(request: ChatRequest): AsyncGenerator<ChatChunk> {
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || config.model || 'deepseek-chat',
          messages: request.messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`DeepSeek API error ${response.status}: ${err}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data:')) continue;

            const data = trimmed.slice(5).trim();
            if (data === '[DONE]') {
              return; // stream complete
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                yield { content: delta, done: false };
              }
              // Check finish reason
              if (parsed.choices?.[0]?.finish_reason) {
                return; // stream complete
              }
            } catch {
              // skip malformed JSON lines
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
