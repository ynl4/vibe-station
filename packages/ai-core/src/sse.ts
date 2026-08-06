import type { ChatChunk } from './types';

/**
 * Parse SSE stream into ChatChunk generator.
 * Used by Nitro server routes to forward upstream SSE responses.
 */
export async function* parseSSEStream(
  _body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatChunk> {
  // TODO: Week 2 — SSE parsing logic
  throw new Error('Not implemented');
}

/**
 * Create an SSE response from a ChatChunk generator.
 */
export function createSSEResponse(_generator: AsyncGenerator<ChatChunk>): Response {
  // TODO: Week 2 — SSE response encoding
  throw new Error('Not implemented');
}
