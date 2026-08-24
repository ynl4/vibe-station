/**
 * Embedding utility for semantic code search.
 *
 * Uses DeepSeek's OpenAI-compatible embeddings API to vectorize snippet
 * text and search queries. Cosine similarity is computed in-memory — fast
 * enough for a personal-scale snippet library (<1000 entries).
 */

// ── Build searchable text from snippet fields ──────────────────────

export function buildSearchText(s: {
  title: string;
  description?: string | null;
  code: string;
  tags?: string[];
}): string {
  const parts = [s.title, s.description || '', s.code.slice(0, 500), ...(s.tags || [])];
  return parts.filter(Boolean).join('\n').trim();
}

// ── DeepSeek embeddings API ─────────────────────────────────────────

const EMBEDDING_API_URL = 'https://api.deepseek.com/v1/embeddings';
const EMBEDDING_MODEL = 'deepseek-chat';

export async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured');

  const response = await fetch(EMBEDDING_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DeepSeek Embeddings API error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as { data: Array<{ embedding: number[] }> };
  return json.data[0].embedding;
}

// ── Cosine similarity ───────────────────────────────────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ── Serialization helpers ───────────────────────────────────────────

export function parseEmbedding(raw: string | null | undefined): number[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'number')) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function serializeEmbedding(vec: number[]): string {
  return JSON.stringify(vec);
}

// ── Convenience ─────────────────────────────────────────────────────

export async function embedSnippet(s: Parameters<typeof buildSearchText>[0]): Promise<number[]> {
  return embedText(buildSearchText(s));
}
