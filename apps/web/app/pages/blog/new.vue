<template>
  <div class="max-w-3xl mx-auto">
    <NuxtLink
      to="/blog"
      class="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6 inline-block"
    >
      {{ t('blog.back') }}
    </NuxtLink>

    <h1 class="text-3xl font-bold mb-8">{{ t('blog.newPost') }}</h1>

    <form @submit.prevent="savePost" class="space-y-5">
      <div>
        <label class="block text-sm text-gray-400 mb-1">{{ t('blog.titleLabel') }}</label>
        <input
          v-model="title"
          type="text"
          required
          placeholder="Post title"
          class="w-full px-4 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none text-white"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">{{ t('blog.tags') }}</label>
        <input
          v-model="tagsInput"
          type="text"
          placeholder="nuxt, ai, devlog"
          class="w-full px-4 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none text-white"
        />
      </div>

      <div>
        <label class="block text-sm text-gray-400 mb-1">{{ t('blog.content') }}</label>
        <textarea
          v-model="content"
          required
          rows="20"
          placeholder="Write your post in Markdown..."
          class="w-full px-4 py-3 rounded-md bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none text-white font-mono text-sm resize-y"
        />
      </div>

      <div class="flex gap-3">
        <button
          type="submit"
          :disabled="saving"
          class="px-5 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {{ saving ? '...' : t('blog.save') }}
        </button>
        <NuxtLink
          to="/blog"
          class="px-5 py-2 rounded-md border border-gray-700 hover:border-gray-500 transition-colors text-sm"
        >
          {{ t('prompts.cancel') }}
        </NuxtLink>
      </div>

      <div v-if="error" class="text-red-400 text-sm">{{ error }}</div>
      <div v-if="success" class="text-green-400 text-sm">
        Post published! <NuxtLink :to="`/blog/${success}`" class="underline">View →</NuxtLink>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const title = ref('');
const tagsInput = ref('');
const content = ref('');
const saving = ref(false);
const error = ref('');
const success = ref('');
const authHeader = { Authorization: `Bearer ${useRuntimeConfig().public.accessToken}` };

async function savePost() {
  saving.value = true;
  error.value = '';
  success.value = '';

  try {
    const tags = tagsInput.value
      .split(',')
      .map((t: string) => t.trim())
      .filter(Boolean);

    const result = await $fetch('/api/posts', {
      method: 'POST',
      headers: authHeader,
      body: { title: title.value, content: content.value, tags },
    });

    success.value = result.slug;
    // Reset form
    title.value = '';
    tagsInput.value = '';
    content.value = '';
  } catch (e: any) {
    error.value = e.data?.statusMessage || 'Failed to save post';
  } finally {
    saving.value = false;
  }
}
</script>
