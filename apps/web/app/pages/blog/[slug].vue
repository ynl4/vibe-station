<template>
  <div class="max-w-3xl mx-auto">
    <NuxtLink
      to="/blog"
      class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
    >
      {{ t('blog.back') }}
    </NuxtLink>

    <div v-if="errorMsg" class="text-red-400">
      {{ errorMsg }}
    </div>

    <article v-else-if="post" class="space-y-6">
      <header>
        <h1 class="text-3xl font-bold">{{ post.title }}</h1>
        <div class="flex items-center gap-3 mt-3 text-sm text-gray-500">
          <span>{{ formatDate(post.createdAt) }}</span>
          <span v-if="post.tags?.length" class="flex gap-1">
            <span
              v-for="tag in post.tags"
              :key="tag"
              class="px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
            >{{ tag }}</span>
          </span>
        </div>
      </header>

      <div class="prose prose-invert max-w-none">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="renderedContent" />
      </div>
    </article>

    <div v-else class="text-gray-500">Loading...</div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const slug = route.params.slug as string;
const post = ref<any>(null);
const errorMsg = ref('');
const authHeader = { Authorization: `Bearer ${useRuntimeConfig().public.accessToken}` };

const renderedContent = computed(() => {
  if (!post.value?.content) return '';
  return post.value.content
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-3">')
    .replace(/^(.+)$/gm, (line: string) =>
      line.startsWith('<') ? line : `<p class="my-3">${line}</p>`
    );
});

onMounted(async () => {
  try {
    post.value = await $fetch(`/api/posts?slug=${slug}`, {
      headers: authHeader,
    });
  } catch (e: any) {
    errorMsg.value = e.data?.statusMessage || 'Failed to load post';
  }
});

function formatDate(d: string | Date) {
  return new Date(d).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
</script>
