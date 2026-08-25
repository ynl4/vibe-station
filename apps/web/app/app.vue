<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <header class="border-b border-gray-800 px-6 py-4">
      <nav class="max-w-6xl mx-auto flex items-center gap-6">
        <h1 class="text-xl font-bold text-white">Vibe Station</h1>
        <div class="flex gap-4 text-sm text-gray-400 flex-1">
          <NuxtLink to="/" class="hover:text-white transition-colors">{{ t('nav.home') }}</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-white transition-colors">{{ t('nav.chat') }}</NuxtLink>
          <NuxtLink to="/prompts" class="hover:text-white transition-colors">{{ t('nav.prompts') }}</NuxtLink>
          <NuxtLink to="/vault" class="hover:text-white transition-colors">{{ t('nav.vault') }}</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-white transition-colors">{{ t('nav.blog') }}</NuxtLink>
          <NuxtLink to="/showcase" class="hover:text-white transition-colors">{{ t('nav.showcase') }}</NuxtLink>
        </div>
        <button
          class="text-xs px-3 py-1 rounded border border-gray-700 hover:bg-gray-800 transition-colors text-gray-400"
          @click="toggleLocale()"
        >
          {{ locale === 'zh' ? 'EN' : '中文' }}
        </button>
      </nav>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8">
      <NuxtPage />
    </main>
  </div>
</template>

<script setup lang="ts">
const { t, locale, toggleLocale } = useI18n();
</script>
