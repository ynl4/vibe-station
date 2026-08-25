<template>
  <div class="space-y-12">
    <!-- Blog Posts Section -->
    <section>
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-2xl font-bold">{{ t('blog.title') }}</h2>
        <NuxtLink
          to="/blog/new"
          class="text-sm px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 transition-colors"
        >
          {{ t('blog.new') }}
        </NuxtLink>
      </div>

      <div v-if="blogPosts.length === 0" class="text-gray-500 text-sm">
        {{ t('blog.noPosts') }}
      </div>

      <div class="space-y-4">
        <NuxtLink
          v-for="post in blogPosts"
          :key="post.slug"
          :to="`/blog/${post.slug}`"
          class="block p-5 rounded-lg border border-gray-800 hover:border-blue-500/50 transition-colors group"
        >
          <h3 class="text-lg font-semibold group-hover:text-blue-400 transition-colors">
            {{ post.title }}
          </h3>
          <div class="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>{{ formatDate(post.createdAt) }}</span>
            <span v-if="post.tags?.length" class="flex gap-1">
              <span
                v-for="tag in post.tags"
                :key="tag"
                class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
              >{{ tag }}</span>
            </span>
          </div>
        </NuxtLink>
      </div>
    </section>

    <!-- Devlog Section -->
    <section>
      <h2 class="text-2xl font-bold mb-6">{{ t('blog.devlog') }}</h2>
      <div v-if="devlogs.length === 0" class="text-gray-500 text-sm">
        {{ t('blog.noDevlog') }}
      </div>

      <div class="space-y-4">
        <NuxtLink
          v-for="entry in devlogs"
          :key="entry.slug"
          :to="`/devlog/${entry.slug}`"
          class="block p-5 rounded-lg border border-gray-800 hover:border-yellow-500/50 transition-colors group"
        >
          <div class="flex items-center gap-2 mb-1">
            <span class="text-xs px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">Devlog</span>
            <span class="text-xs text-gray-600">{{ entry.date }}</span>
          </div>
          <h3 class="text-lg font-semibold group-hover:text-yellow-400 transition-colors">
            {{ entry.title }}
          </h3>
          <p v-if="entry.excerpt" class="text-sm text-gray-500 mt-1 truncate">
            {{ entry.excerpt }}
          </p>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const token = useRuntimeConfig().public.accessToken;
const authHeader = { Authorization: `Bearer ${token}` };

const blogPosts = ref<any[]>([]);
const devlogs = ref<any[]>([]);

onMounted(async () => {
  try {
    const [posts, logs] = await Promise.all([
      $fetch('/api/posts', { headers: authHeader }),
      $fetch('/api/devlog', { headers: authHeader }),
    ]);
    blogPosts.value = posts || [];
    devlogs.value = logs || [];
  } catch { /* leave defaults */ }
});

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
