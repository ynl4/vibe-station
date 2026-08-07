import { describe, it, expect } from 'vitest';

// ── Test targets — SSE parsing logic (from @vibe/ai-core) ──

interface ChatChunk {
  content: string;
  done?: boolean;
}

async function* parseSSEStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<ChatChunk> {
  const reader = stream.getReader();
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
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            yield { content: '', done: true };
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              yield { content };
            }
          } catch {
            // Skip unparseable lines
          }
        }
      }
    }

    // Flush remaining buffer
    if (buffer.startsWith('data: ') && buffer.slice(6).trim() !== '[DONE]') {
      try {
        const parsed = JSON.parse(buffer.slice(6).trim());
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) {
          yield { content };
        }
      } catch { /* ignore */ }
    }
  } finally {
    reader.releaseLock();
  }
}

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let index = 0;
  return new ReadableStream({
    pull(controller) {
      if (index < chunks.length) {
        controller.enqueue(encoder.encode(chunks[index++]));
      } else {
        controller.close();
      }
    },
  });
}

// ── Tests ────────────────────────────────────────────────────

describe('parseSSEStream', () => {
  it('parses a simple SSE stream with one chunk', async () => {
    const stream = createMockStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    expect(results).toEqual([{ content: 'Hello' }]);
  });

  it('parses multiple chunks', async () => {
    const stream = createMockStream([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" World"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"!"}}]}\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    const fullText = results.map(r => r.content).join('');
    expect(fullText).toBe('Hello World!');
  });

  it('handles [DONE] signal', async () => {
    const stream = createMockStream([
      'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\n',
      'data: [DONE]\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ content: 'Hi' });
    expect(results[1]).toEqual({ content: '', done: true });
  });

  it('skips empty delta content', async () => {
    const stream = createMockStream([
      'data: {"choices":[{"delta":{"content":""}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"Real"}}]}\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    expect(results).toEqual([{ content: 'Real' }]);
  });

  it('handles split SSE lines across chunks (partial buffer)', async () => {
    const stream = createMockStream([
      'data: {"choices":[{"delta":{"content":"Par"}}]}\n',
      '\ndata: {"choices":[{"delta":{"content":"tial"}}]}\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    const fullText = results.map(r => r.content).join('');
    expect(fullText).toBe('Partial');
  });

  it('skips unparseable JSON lines gracefully', async () => {
    const stream = createMockStream([
      'data: {broken json}\n\n',
      'data: {"choices":[{"delta":{"content":"After"}}]}\n\n',
    ]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    expect(results).toEqual([{ content: 'After' }]);
  });

  it('handles empty stream', async () => {
    const stream = createMockStream([]);

    const results: ChatChunk[] = [];
    for await (const chunk of parseSSEStream(stream)) {
      results.push(chunk);
    }

    expect(results).toEqual([]);
  });
});
