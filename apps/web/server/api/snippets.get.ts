import { snippets } from '@vibe/db/schema';
import { desc, like, or } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
  const db = useDB();
  const query = getQuery(event);
  const search = query.search as string | undefined;
  const language = query.language as string | undefined;

  let q = db.select().from(snippets);

  if (search) {
    const term = `%${search}%`;
    q = q.where(
      or(
        like(snippets.title, term),
        like(snippets.description, term),
        like(snippets.code, term),
        like(snippets.tags, term),
      )
    );
  }

  if (language) {
    q = q.where(like(snippets.language, `%${language}%`));
  }

  return q.orderBy(desc(snippets.createdAt)).all();
});
