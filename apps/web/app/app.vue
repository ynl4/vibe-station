<template>
  <div class="min-h-screen bg-gray-950 text-gray-100">
    <header class="border-b border-gray-800 px-6 py-4">
      <nav class="max-w-6xl mx-auto flex items-center gap-6">
        <h1 class="text-xl font-bold text-white">Vibe Station</h1>
        <div class="flex gap-4 text-sm text-gray-400">
          <NuxtLink to="/" class="hover:text-white transition-colors">Home</NuxtLink>
          <NuxtLink to="/chat" class="hover:text-white transition-colors">Chat</NuxtLink>
          <NuxtLink to="/prompts" class="hover:text-white transition-colors">Prompts</NuxtLink>
          <NuxtLink to="/vault" class="hover:text-white transition-colors">Vault</NuxtLink>
          <NuxtLink to="/blog" class="hover:text-white transition-colors">Blog</NuxtLink>
          <NuxtLink to="/showcase" class="hover:text-white transition-colors">Showcase</NuxtLink>
        </div>
      </nav>
    </header>

    <main class="max-w-6xl mx-auto px-6 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
