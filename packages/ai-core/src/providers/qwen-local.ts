import type { ChatRequest, ChatChunk, AIProviderConfig } from '../types';

/**
 * Qwen local AI provider via WebLLM / Transformers.js.
 * Implementation: Week 3 (WebLLM Local Mode).
 */
export function createQwenLocalProvider(_config: AIProviderConfig) {
  return {
    async *chat(_request: ChatRequest): AsyncGenerator<ChatChunk> {
      // TODO: Week 3 — browser-side inference via WebLLM
      throw new Error('Not implemented');
    },
  };
}
