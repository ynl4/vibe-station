/**
 * WebLLM local inference composable.
 * Manages model lifecycle: idle → downloading(progress%) → ready → error.
 * Model: Qwen2.5-0.5B-Instruct (~300MB, ~6GB RAM needed for WebGPU).
 * WASM fallback available but slower.
 */

export type ModelState = 'idle' | 'downloading' | 'ready' | 'error';

export function useLocalLLM() {
  const modelState = ref<ModelState>('idle');
  const downloadProgress = ref(0); // 0–1
  const downloadText = ref('');
  const errorMessage = ref('');
  const engine = ref<any>(null);
  const canUse = ref(false); // WebGPU or WASM available

  // Check WebGPU support (don't rely on navigator.deviceMemory)
  function checkCapabilities(): boolean {
    if (!import.meta.client) return false;
    // Check WebGPU
    if ('gpu' in navigator) return true;
    // Check if WebAssembly is available (WASM fallback)
    if (typeof WebAssembly === 'object') return true;
    return false;
  }

  async function init() {
    if (!import.meta.client) return;
    canUse.value = checkCapabilities();
  }

  async function loadModel() {
    if (modelState.value === 'ready') return;
    if (modelState.value === 'downloading') return;

    modelState.value = 'downloading';
    downloadProgress.value = 0;
    errorMessage.value = '';

    try {
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      const createdEngine = await CreateMLCEngine(
        'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
        {
          initProgressCallback: (report: { progress: number; text: string }) => {
            downloadProgress.value = report.progress;
            downloadText.value = report.text;
          },
        },
      );

      engine.value = createdEngine;
      modelState.value = 'ready';
    } catch (e: any) {
      modelState.value = 'error';
      errorMessage.value = e.message || 'Failed to load local model';
    }
  }

  async function* chat(messages: Array<{ role: string; content: string }>): AsyncGenerator<string> {
    if (!engine.value || modelState.value !== 'ready') {
      throw new Error('Local model not ready');
    }

    const startTime = Date.now();
    const reply = await engine.value.chat.completions.create({
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    });

    let fullContent = '';
    for await (const chunk of reply) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        fullContent += delta;
        yield delta;
      }
    }

    // Return metadata in last "chunk" as a special marker
    const latency = Date.now() - startTime;
    yield `__META__${JSON.stringify({ latency, tokenCount: Math.ceil(fullContent.length / 4) })}`;
  }

  function unload() {
    engine.value = null;
    modelState.value = 'idle';
    downloadProgress.value = 0;
  }

  return {
    modelState,
    downloadProgress,
    downloadText,
    errorMessage,
    canUse,
    engine,
    init,
    loadModel,
    chat,
    unload,
  };
}
