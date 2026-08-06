import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface DevlogEntry {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  content: string;
  excerpt: string;
}

export default defineEventHandler(async (event) => {
  const devlogDir = resolve(process.cwd(), '../../docs/devlog');

  try {
    const files = await readdir(devlogDir);
    const mdFiles = files.filter(f => f.endsWith('.md')).sort().reverse();

    const entries: DevlogEntry[] = [];

    for (const file of mdFiles) {
      const raw = await readFile(resolve(devlogDir, file), 'utf-8');
      const { title, date, tags, content } = parseFrontmatter(raw);
      entries.push({
        slug: file.replace('.md', ''),
        title,
        date,
        tags,
        content,
        excerpt: content.split('\n').find(l => l.trim() && !l.startsWith('#'))?.slice(0, 120) || '',
      });
    }

    return entries;
  } catch {
    return [];
  }
});

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    return { title: '', date: '', tags: [] as string[], content: raw };
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
    title: frontmatter.title || '',
    date: frontmatter.date || '',
    tags: frontmatter.tags || [],
    content: match[2].trim(),
  };
}
