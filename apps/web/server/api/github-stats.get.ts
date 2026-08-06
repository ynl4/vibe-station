/**
 * GitHub Stats API — public endpoint with 6h in-memory cache.
 * Aggregates: profile info, repo count, stars, recent commits, languages.
 */

interface GitHubStats {
  username: string;
  name: string;
  avatarUrl: string;
  bio: string;
  publicRepos: number;
  totalStars: number;
  followers: number;
  following: number;
  recentRepos: Array<{
    name: string;
    description: string;
    stars: number;
    language: string;
    updatedAt: string;
  }>;
  topLanguages: Array<{ name: string; count: number }>;
  cachedAt: number;
}

interface CacheEntry {
  data: GitHubStats;
  timestamp: number;
}

const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, CacheEntry>();

export default defineEventHandler(async (event) => {
  const username = useRuntimeConfig(event).githubUsername || 'yzh';

  // Check cache
  const cached = cache.get(username);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const stats = await fetchGitHubStats(username);
    cache.set(username, { data: stats, timestamp: Date.now() });
    return stats;
  } catch (e: any) {
    // Return cached data on error if available, even if expired
    if (cached) return cached.data;

    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to fetch GitHub stats',
      message: e.message,
    });
  }
});

async function fetchGitHubStats(username: string): Promise<GitHubStats> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'vibe-station/1.0',
  };

  // Optionally add GitHub token for higher rate limit
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  // Fetch user profile
  const userRes = await fetch(`https://api.github.com/users/${username}`, { headers });
  if (!userRes.ok) {
    throw new Error(`GitHub API error: ${userRes.status}`);
  }
  const user = await userRes.json();

  // Fetch repos (sorted by updated)
  const reposRes = await fetch(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=10&type=owner`,
    { headers }
  );
  const repos: any[] = reposRes.ok ? await reposRes.json() : [];

  // Calculate stats
  const totalStars = repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0);

  // Top languages
  const langCounts: Record<string, number> = {};
  repos.forEach((r: any) => {
    if (r.language) {
      langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    }
  });
  const topLanguages = Object.entries(langCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }));

  return {
    username: user.login,
    name: user.name || user.login,
    avatarUrl: user.avatar_url,
    bio: user.bio || '',
    publicRepos: user.public_repos,
    totalStars,
    followers: user.followers,
    following: user.following,
    recentRepos: repos.slice(0, 5).map((r: any) => ({
      name: r.name,
      description: r.description || '',
      stars: r.stargazers_count || 0,
      language: r.language || 'Unknown',
      updatedAt: r.updated_at,
    })),
    topLanguages,
    cachedAt: Date.now(),
  };
}
