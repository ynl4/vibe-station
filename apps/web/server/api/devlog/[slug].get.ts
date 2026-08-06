import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')!;
  const devlogDir = resolve(process.cwd(), '../../docs/devlog');
  const filePath = resolve(devlogDir, `${slug}.md`);

  try {
    const raw = await readFile(filePath, 'utf-8');
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) {
      throw createError({ statusCode: 404, statusMessage: 'Invalid devlog format' });
    }

    const frontmatter: Record<string, any> = {};
    for (const line of match[1].split('\n')) {
      const kv = line.match(/^(\w+):\s*(.+)$/);
      if (kv) {
        const key = kv[1];
        let val: any = kv[2].trim();
        if (val.startsWith('[') && val.endsWith(']')) {
          val = val.slice(1, -1).split(',').map((s: string) => s.trim());
        }
        frontmatter[key] = val;
      }
    }

    return {
      slug,
      title: frontmatter.title || slug,
      date: frontmatter.date || '',
      tags: frontmatter.tags || [],
      content: match[2].trim(),
    };
  } catch (e: any) {
    if (e.statusCode) throw e;
    throw createError({ statusCode: 404, statusMessage: 'Devlog entry not found' });
  }
});
