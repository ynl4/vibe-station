/**
 * Client-only plugin that eagerly warms the WebLLM module singleton.
 *
 * Loading @mlc-ai/web-llm from a single import path (and a single embind
 * WASM runtime) is required to avoid the "Expected null or instance of
 * Tokenizer, got an instance of Tokenizer" error. This plugin initializes
 * that singleton as early as possible so composables and pages share the
 * same module instance.
 */
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return;

  // Use a dynamic import so the composable's own singleton logic remains
  // the single source of truth for how @mlc-ai/web-llm is loaded.
  const { getWebLLMModule } = await import('~/composables/useLocalLLM');

  try {
    await getWebLLMModule();
    console.log('[web-llm-plugin] singleton warmed');
  } catch (e: any) {
    // A warmup failure here is non-fatal; the chat UI will surface a clear
    // error when the user tries to load the local model.
    console.warn('[web-llm-plugin] failed to warm singleton:', e.message || e);
  }
});
