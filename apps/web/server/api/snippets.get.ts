import { snippets } from '@vibe/db/schema';
import { desc, like, or } from 'drizzle-orm';
import { embedText, cosineSimilarity, parseEmbedding } from '../utils/embedding';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const search = query.search as string | undefined;
  const language = query.language as string | undefined;
  const mode = (query.mode as string) || 'keyword';
  const limit = parseInt((query.limit as string) || '20');

  // ── Keyword search (default, existing behaviour) ───────────────
  if (mode !== 'semantic' || !search) {
    let q = db.select().from(snippets);

    if (search) {
      const term = `%${search}%`;
      q = q.where(
        or(
          like(snippets.title, term),
          like(snippets.description, term),
          like(snippets.code, term),
          like(snippets.tags, term),
        ),
      );
    }

    if (language) {
      q = q.where(like(snippets.language, `%${language}%`));
    }

    return q.orderBy(desc(snippets.createdAt)).all();
  }

  // ── Semantic search ────────────────────────────────────────────
  if (!process.env.DEEPSEEK_API_KEY) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Semantic search requires DEEPSEEK_API_KEY to be configured.',
    });
  }

  // Generate query embedding
  let queryVec: number[];
  try {
    queryVec = await embedText(search);
  } catch (e: any) {
    console.error('[semantic-search] Failed to embed query:', e.message);
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to embed search query',
      data: e.message,
    });
  }

  // Fetch candidates (respect language filter)
  const candidates = language
    ? db.select().from(snippets).where(like(snippets.language, `%${language}%`)).all()
    : db.select().from(snippets).all();

  // Score and rank
  const scored = candidates
    .map((s) => {
      const vec = parseEmbedding((s as any).embedding);
      if (!vec) return { snippet: s, score: -1 };
      return { snippet: s, score: cosineSimilarity(queryVec, vec) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // Strip embedding column from response (don't send 1024 floats to the client)
  return scored.map((x) => {
    const { embedding, ...rest } = x.snippet as any;
    return { ...rest, _score: Math.round(x.score * 1000) / 1000 };
  });
});
