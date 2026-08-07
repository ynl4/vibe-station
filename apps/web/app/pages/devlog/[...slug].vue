<template>
  <div class="max-w-3xl mx-auto">
    <NuxtLink
      to="/blog"
      class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
    >
      {{ t('blog.back') }}
    </NuxtLink>

    <div v-if="entry" class="space-y-6">
      <header>
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400">Devlog</span>
          <span class="text-xs text-gray-600">{{ entry.date }}</span>
        </div>
        <h1 class="text-3xl font-bold">{{ entry.title }}</h1>
        <div v-if="entry.tags?.length" class="flex gap-1 mt-2">
          <span
            v-for="tag in entry.tags"
            :key="tag"
            class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
          >{{ tag }}</span>
        </div>
      </header>

      <article class="prose prose-invert max-w-none">
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-html="renderedContent" />
      </article>
    </div>

    <div v-else class="text-gray-500">Devlog entry not found.</div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const route = useRoute();
const slug = (route.params.slug as string[])?.join('/') || '';
const entry = ref<any>(null);
const authHeader = { Authorization: `Bearer ${useRuntimeConfig().public.accessToken}` };

const renderedContent = computed(() => {
  if (!entry.value?.content) return '';
  return (entry.value.content as string)
    .replace(/^### (.+)$/gm, '<h3 class="text-xl font-semibold mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-2xl font-semibold mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-3xl font-bold mt-10 mb-4">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="bg-gray-800 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n\n/g, '</p><p class="my-3">')
    .replace(/^(.+)$/gm, (line: string) =>
      line.startsWith('<') ? line : `<p class="my-3">${line}</p>`
    );
});

onMounted(async () => {
  try {
    entry.value = await $fetch(`/api/devlog/${slug}`, {
      headers: authHeader,
    });
  } catch {
    entry.value = null;
  }
});
</script>
