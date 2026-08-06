<template>
  <div class="space-y-10">
    <!-- Hero -->
    <section class="text-center py-16">
      <h2 class="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        Vibe Station
      </h2>
      <p class="text-gray-400 text-lg max-w-2xl mx-auto">
        Personal AI Developer Workspace — Built with AI, for AI-powered development.
      </p>
    </section>

    <!-- GitHub Stats Card -->
    <section v-if="stats" class="p-6 rounded-lg border border-gray-800">
      <div class="flex items-center gap-4 mb-4">
        <img
          v-if="stats.avatarUrl"
          :src="stats.avatarUrl"
          :alt="stats.username"
          class="w-14 h-14 rounded-full border-2 border-gray-700"
        />
        <div>
          <h3 class="text-lg font-bold">{{ stats.name }}</h3>
          <a
            :href="`https://github.com/${stats.username}`"
            target="_blank"
            class="text-sm text-blue-400 hover:underline"
          >@{{ stats.username }}</a>
          <p v-if="stats.bio" class="text-sm text-gray-400 mt-0.5">{{ stats.bio }}</p>
        </div>
      </div>

      <div class="grid grid-cols-4 gap-4 mb-4">
        <div class="text-center p-3 rounded bg-gray-900/50">
          <div class="text-2xl font-bold text-white">{{ stats.publicRepos }}</div>
          <div class="text-xs text-gray-500">Repos</div>
        </div>
        <div class="text-center p-3 rounded bg-gray-900/50">
          <div class="text-2xl font-bold text-yellow-400">{{ stats.totalStars }}</div>
          <div class="text-xs text-gray-500">Stars</div>
        </div>
        <div class="text-center p-3 rounded bg-gray-900/50">
          <div class="text-2xl font-bold text-white">{{ stats.followers }}</div>
          <div class="text-xs text-gray-500">Followers</div>
        </div>
        <div class="text-center p-3 rounded bg-gray-900/50">
          <div class="text-2xl font-bold text-white">{{ stats.following }}</div>
          <div class="text-xs text-gray-500">Following</div>
        </div>
      </div>

      <!-- Top Languages -->
      <div v-if="stats.topLanguages?.length" class="flex gap-2 mb-4">
        <span
          v-for="lang in stats.topLanguages"
          :key="lang.name"
          class="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400"
        >{{ lang.name }} ({{ lang.count }})</span>
      </div>

      <!-- Recent Repos -->
      <div v-if="stats.recentRepos?.length">
        <h4 class="text-sm font-semibold text-gray-400 mb-2">Recent Repos</h4>
        <div class="space-y-2">
          <a
            v-for="repo in stats.recentRepos"
            :key="repo.name"
            :href="`https://github.com/${stats.username}/${repo.name}`"
            target="_blank"
            class="flex items-center justify-between p-2 rounded hover:bg-gray-900/50 transition-colors"
          >
            <div>
              <span class="text-sm text-gray-300">{{ repo.name }}</span>
              <span v-if="repo.description" class="text-xs text-gray-600 ml-2 hidden sm:inline">
                — {{ repo.description.slice(0, 60) }}{{ repo.description.length > 60 ? '...' : '' }}
              </span>
            </div>
            <div class="flex items-center gap-3 text-xs text-gray-500">
              <span v-if="repo.language" class="text-gray-500">{{ repo.language }}</span>
              <span class="text-yellow-600">★ {{ repo.stars }}</span>
            </div>
          </a>
        </div>
      </div>
    </section>

    <!-- Loading / Error -->
    <section v-else-if="error" class="p-6 rounded-lg border border-gray-800 text-center">
      <p class="text-gray-500 text-sm">{{ error }}</p>
    </section>

    <!-- Navigation Cards -->
    <section class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <NuxtLink to="/chat" class="p-6 rounded-lg border border-gray-800 hover:border-blue-500 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-blue-400 transition-colors">AI Chat</h3>
        <p class="text-sm text-gray-500 mt-1">Local + Cloud, message-level switching</p>
      </NuxtLink>
      <NuxtLink to="/prompts" class="p-6 rounded-lg border border-gray-800 hover:border-purple-500 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-purple-400 transition-colors">Prompt Studio</h3>
        <p class="text-sm text-gray-500 mt-1">Templates, variables, testing</p>
      </NuxtLink>
      <NuxtLink to="/vault" class="p-6 rounded-lg border border-gray-800 hover:border-green-500 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-green-400 transition-colors">Code Vault</h3>
        <p class="text-sm text-gray-500 mt-1">Snippets + AI explanation</p>
      </NuxtLink>
      <NuxtLink to="/blog" class="p-6 rounded-lg border border-gray-800 hover:border-yellow-500 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-yellow-400 transition-colors">Devlog</h3>
        <p class="text-sm text-gray-500 mt-1">Vibe Coding timeline</p>
      </NuxtLink>
      <NuxtLink to="/showcase" class="p-6 rounded-lg border border-gray-800 hover:border-pink-500 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-pink-400 transition-colors">Showcase</h3>
        <p class="text-sm text-gray-500 mt-1">EdgeGallery & more</p>
      </NuxtLink>
      <NuxtLink to="/blog/new" class="p-6 rounded-lg border border-gray-800 hover:border-blue-500/30 transition-colors group">
        <h3 class="text-lg font-semibold group-hover:text-gray-300 transition-colors">+ New Post</h3>
        <p class="text-sm text-gray-500 mt-1">Write a blog entry</p>
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
const stats = ref<any>(null);
const error = ref('');

onMounted(async () => {
  try {
    stats.value = await $fetch('/api/github-stats');
  } catch (e: any) {
    error.value = 'GitHub stats unavailable right now.';
  }
});
</script>
