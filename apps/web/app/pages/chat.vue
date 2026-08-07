<template>
  <div class="flex h-[calc(100vh-4rem)]">
    <!-- Sidebar: Session List -->
    <aside class="w-64 border-r border-gray-800 flex flex-col shrink-0">
      <div class="p-3 border-b border-gray-800">
        <button
          class="w-full text-sm px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-500 transition-colors"
          @click="newSession()"
        >
          {{ t('chat.newSession') }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          v-for="session in sessions"
          :key="session.id"
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate flex items-center gap-2 group"
          :class="currentSessionId === session.id
            ? 'bg-gray-800 text-white'
            : 'text-gray-400 hover:bg-gray-900 hover:text-gray-200'"
          @click="selectSession(session.id)"
        >
          <span class="truncate flex-1">{{ session.title }}</span>
          <span
            class="hidden group-hover:inline text-gray-600 hover:text-red-400 shrink-0"
            @click.stop="deleteSession(session.id)"
          >×</span>
        </button>

        <div v-if="sessions.length === 0" class="text-gray-600 text-xs text-center py-4">
          {{ locale === 'zh' ? '暂无对话' : 'No conversations yet' }}
        </div>
      </div>
    </aside>

    <!-- Main Chat Area -->
    <div class="flex-1 flex flex-col min-w-0">
      <!-- Model Switcher -->
      <div class="flex items-center gap-2 px-4 py-2 border-b border-gray-800 shrink-0 flex-wrap">
        <span class="text-xs text-gray-500">{{ locale === 'zh' ? '模型:' : 'Model:' }}</span>
        <button
          :class="[
            'text-xs px-2 py-1 rounded transition-colors',
            model === 'deepseek-chat'
              ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
              : 'text-gray-500 hover:text-gray-300'
          ]"
          @click="model = 'deepseek-chat'"
        >
          {{ t('chat.cloud') }} (DeepSeek)
        </button>
        <button
          v-if="localLLM.canUse"
          :class="[
            'text-xs px-2 py-1 rounded transition-colors',
            model === 'qwen-local'
              ? 'bg-green-900/50 text-green-400 border border-green-700'
              : localLLM.modelState === 'error'
                ? 'text-red-500 hover:text-red-400'
                : 'text-gray-500 hover:text-gray-300'
          ]"
          :title="localLLM.modelState === 'error' ? localLLM.errorMessage : 'Local Qwen 2.5 0.5B'"
          @click="switchToLocal"
        >
          <template v-if="localLLM.modelState === 'downloading'">
            Local {{ Math.round(localLLM.downloadProgress * 100) }}%
          </template>
          <template v-else-if="localLLM.modelState === 'ready'">
            Local (Qwen) ✓
          </template>
          <template v-else-if="localLLM.modelState === 'error'">
            Local (error)
          </template>
          <template v-else>
            Local (Qwen) ↓
          </template>
        </button>
        <span v-else class="text-xs text-gray-600" title="WebGPU/WebAssembly not available">
          Local N/A
        </span>
      </div>

      <!-- Messages -->
      <div ref="messagesEl" class="flex-1 overflow-y-auto p-4 space-y-4">
        <div v-if="messages.length === 0" class="text-center text-gray-500 mt-20">
          <p class="text-lg mb-2">{{ locale === 'zh' ? '开始对话' : 'Start a conversation' }}</p>
          <p class="text-sm text-gray-600">{{ locale === 'zh' ? '发送消息开始对话' : 'Send a message to begin.' }}</p>
        </div>

        <div
          v-for="(msg, i) in messages"
          :key="i"
          class="flex gap-3"
          :class="msg.role === 'user' ? 'justify-end' : ''"
        >
          <div
            class="max-w-[80%] rounded-lg px-4 py-2.5 text-sm"
            :class="msg.role === 'user'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-800 text-gray-200'"
          >
            <div v-if="msg.content" class="whitespace-pre-wrap">{{ msg.content }}</div>
            <div v-else class="flex gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 0ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 150ms" />
              <span class="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style="animation-delay: 300ms" />
            </div>
            <div v-if="msg.latencyMs" class="text-xs text-gray-500 mt-1">
              {{ (msg.latencyMs / 1000).toFixed(1) }}s
              <span class="text-gray-600">{{ msg.model }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t border-gray-800 p-4 shrink-0">
        <form class="flex gap-2" @submit.prevent="handleSend">
          <input
            v-model="input"
            type="text"
            :disabled="isStreaming"
            :placeholder="t('chat.typePlaceholder') + ' (Enter)'"
            class="flex-1 px-4 py-2.5 rounded-md bg-gray-900 border border-gray-700 focus:border-blue-500 outline-none text-white disabled:opacity-50 text-sm"
            autofocus
          />
          <button
            type="submit"
            :disabled="!input.trim() || isStreaming"
            class="px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {{ t('chat.send') }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();
const {
  sessions,
  currentSessionId,
  messages,
  isStreaming,
  model,
  loadSessions,
  selectSession,
  newSession,
  deleteSession,
  sendMessage,
  setLocalLLM,
} = useChat();

const localLLM = useLocalLLM();
setLocalLLM(localLLM);

const input = ref('');
const messagesEl = ref<HTMLElement | null>(null);

function switchToLocal() {
  if (localLLM.modelState.value === 'idle') {
    localLLM.loadModel();
  }
  model.value = 'qwen-local';
}

onMounted(() => {
  loadSessions();
  localLLM.init();
});

async function handleSend() {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendMessage(text);
  nextTick(() => {
    if (messagesEl.value) {
      messagesEl.value.scrollTop = messagesEl.value.scrollHeight;
    }
  });
}
</script>
