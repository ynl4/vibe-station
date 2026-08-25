<template>
  <div class="space-y-8">
    <section class="text-center py-12">
      <h2 class="text-3xl font-bold mb-3">EdgeGallery Showcase</h2>
      <p class="text-gray-400 max-w-xl mx-auto">
        On-device AI gallery app — detailed project page coming soon.
      </p>
    </section>

    <div class="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
      <div class="p-6 rounded-lg border border-gray-800 space-y-3">
        <h3 class="text-lg font-semibold text-pink-400">Project Overview</h3>
        <p class="text-sm text-gray-400">
          EdgeGallery is an on-device AI image gallery app that runs models locally
          on mobile devices, enabling smart photo organization, search, and generation
          without cloud dependency.
        </p>
        <div class="flex gap-2 text-xs">
          <span class="px-2 py-0.5 rounded bg-gray-800 text-gray-400">On-device AI</span>
          <span class="px-2 py-0.5 rounded bg-gray-800 text-gray-400">Mobile</span>
          <span class="px-2 py-0.5 rounded bg-gray-800 text-gray-400">Flutter</span>
        </div>
      </div>

      <div class="p-6 rounded-lg border border-gray-800 space-y-3">
        <h3 class="text-lg font-semibold text-pink-400">Architecture</h3>
        <div class="rounded bg-gray-900/50 p-4 text-center">
          <div class="space-y-2 text-xs text-gray-600 font-mono">
            <div>┌─────────────────┐</div>
            <div>│   Flutter UI    │</div>
            <div>├─────────────────┤</div>
            <div>│  On-device AI   │</div>
            <div>│  (TFLite/MLX)   │</div>
            <div>├─────────────────┤</div>
            <div>│  Local Storage  │</div>
            <div>└─────────────────┘</div>
          </div>
        </div>
      </div>

      <div class="p-6 rounded-lg border border-gray-800 space-y-3">
        <h3 class="text-lg font-semibold text-pink-400">Demo Video</h3>
        <div class="rounded bg-gray-900/50 aspect-video flex items-center justify-center">
          <span class="text-gray-600 text-sm">Coming Soon</span>
          <!-- <video controls class="w-full rounded"><source src="" /></video> -->
        </div>
      </div>

      <div class="p-6 rounded-lg border border-gray-800 space-y-3">
        <h3 class="text-lg font-semibold text-pink-400">Download</h3>
        <div class="space-y-2">
          <div class="flex items-center justify-between p-3 rounded bg-gray-900/50">
            <div>
              <span class="text-sm text-gray-300">Android APK</span>
              <p class="text-xs text-gray-600">v0.1.0</p>
            </div>
            <span class="text-xs text-gray-600">Coming Soon</span>
          </div>
          <div class="flex items-center justify-between p-3 rounded bg-gray-900/50">
            <div>
              <span class="text-sm text-gray-300">iOS TestFlight</span>
              <p class="text-xs text-gray-600">v0.1.0</p>
            </div>
            <span class="text-xs text-gray-600">Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
