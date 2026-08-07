export interface ChatMessage {
  id?: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: string;
  latencyMs?: number;
  createdAt?: string;
}

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
}

function getAuthHeader() {
  const config = useRuntimeConfig();
  return `Bearer ${config.public.accessToken}`;
}

export function useChat() {
  const sessions = ref<ChatSession[]>([]);
  const currentSessionId = ref<number | null>(null);
  const messages = ref<ChatMessage[]>([]);
  const isStreaming = ref(false);
  const model = ref<'deepseek-chat' | 'qwen-local'>('deepseek-chat');
  // Local LLM instance (set from chat page)
  let localLLM: ReturnType<typeof useLocalLLM> | null = null;

  function setLocalLLM(llm: ReturnType<typeof useLocalLLM>) {
    localLLM = llm;
  }

  async function loadSessions() {
    try {
      sessions.value = await $fetch('/api/chat/sessions', {
        headers: { Authorization: getAuthHeader() },
      });
    } catch { /* ignore */ }
  }

  async function loadMessages(sessionId: number) {
    try {
      const data = await $fetch(`/api/chat/sessions/${sessionId}`, {
        headers: { Authorization: getAuthHeader() },
      });
      messages.value = data.messages || [];
    } catch { /* ignore */ }
  }

  async function selectSession(sessionId: number) {
    currentSessionId.value = sessionId;
    await loadMessages(sessionId);
  }

  async function newSession() {
    currentSessionId.value = null;
    messages.value = [];
  }

  async function deleteSession(sessionId: number) {
    try {
      await $fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: getAuthHeader() },
      });
      sessions.value = sessions.value.filter(s => s.id !== sessionId);
      if (currentSessionId.value === sessionId) {
        newSession();
      }
    } catch { /* ignore */ }
  }

  async function sendMessage(content: string) {
    if (!content.trim() || isStreaming.value) return;

    // Add user message immediately
    messages.value.push({ role: 'user', content });

    // Add placeholder for streaming
    const assistantMsg: ChatMessage = { role: 'assistant', content: '' };
    messages.value.push(assistantMsg);

    isStreaming.value = true;

    // Local mode: use WebLLM directly
    if (model.value === 'qwen-local') {
      await sendLocalMessage(assistantMsg, content);
      isStreaming.value = false;
      return;
    }

    // Cloud mode: use API
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: getAuthHeader(),
        },
        body: JSON.stringify({
          sessionId: currentSessionId.value,
          message: content,
          model: model.value,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;

          const data = trimmed.slice(5).trim();
          try {
            const parsed = JSON.parse(data);
            // First chunk may contain sessionId
            if (parsed.sessionId && !currentSessionId.value) {
              currentSessionId.value = parsed.sessionId;
              loadSessions();
            }
            if (parsed.content) {
              assistantMsg.content += parsed.content;
            }
            if (parsed.done) break;
          } catch { /* skip */ }
        }
      }
    } catch (e: any) {
      assistantMsg.content += `\n\n[Error: ${e.message}]`;
    } finally {
      isStreaming.value = false;
    }
  }

  async function sendLocalMessage(assistantMsg: ChatMessage, content: string) {
    if (!localLLM || localLLM.modelState.value !== 'ready') {
      assistantMsg.content = '[Error: Local model not loaded. Please download the model first.]';
      return;
    }

    const history = messages.value
      .filter(m => m.content && m.role !== 'assistant' ? true : m.content) // include filled messages
      .slice(0, -1) // exclude the placeholder we just added
      .map(m => ({ role: m.role, content: m.content }));

    const startTime = Date.now();

    try {
      for await (const chunk of localLLM.chat(history)) {
        if (chunk.startsWith('__META__')) {
          const meta = JSON.parse(chunk.slice(8));
          assistantMsg.model = 'qwen2.5-0.5b';
          assistantMsg.provider = 'local';
          assistantMsg.latencyMs = meta.latency;
        } else {
          assistantMsg.content += chunk;
        }
      }
    } catch (e: any) {
      assistantMsg.content += `\n\n[Error: ${e.message}]`;
    }
  }

  return {
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
  };
}
