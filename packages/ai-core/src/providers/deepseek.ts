import type { ChatRequest, ChatChunk, AIProviderConfig } from '../types';

/**
 * DeepSeek cloud AI provider.
 * Implementation: Week 2 (Cloud Chat).
 */
export function createDeepSeekProvider(_config: AIProviderConfig) {
  return {
    async *chat(_request: ChatRequest): AsyncGenerator<ChatChunk> {
      // TODO: Week 2 — SSE streaming via Nitro proxy
      throw new Error('Not implemented');
    },
  };
}
