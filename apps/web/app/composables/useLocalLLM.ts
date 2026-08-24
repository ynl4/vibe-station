/**
 * WebLLM local inference composable.
 * Manages model lifecycle: idle → downloading(progress%) → ready → error.
 * Model: Qwen2-0.5B-Instruct (~300MB download, ~2GB+ RAM for WebGPU).
 * WASM fallback available but slower.
 */

import { computed, ref } from 'vue';

export type ModelState = 'idle' | 'downloading' | 'ready' | 'error';

/** Type of the @mlc-ai/web-llm module (loaded client-only by the Nuxt plugin). */
type WebLLMModule = typeof import('@mlc-ai/web-llm');

/**
 * WebLLM (v0.2.x) requires WebGPU to run models. WebAssembly alone is NOT
 * enough — treat it as unsupported so users get a clear error instead of a
 * silent "download" that never starts.
 */
export function supportsWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false;
  return 'gpu' in navigator;
}

export const MODEL_ID = 'Qwen2-0.5B-Instruct-q4f16_1-MLC';

// Default download sources for web-llm 0.2.84.
// - The wasm runtime is served from this app (public/web-llm/) so it never
//   depends on raw.githubusercontent.com, which is often blocked in mainland
//   China. Re-download it after upgrading @mlc-ai/web-llm.
// - Model weights are proxied through this app's Nitro server
//   (/api/llm-model/...), which fetches from hf-mirror.com server-side and
//   streams back same-origin — no CORS or blocked-host issues.
// Both can still be overridden via LOCAL_LLM_MODEL_URL / LOCAL_LLM_MODEL_LIB_URL.
const DEFAULT_MODEL_URL = `/api/llm-model/${MODEL_ID}`;
const DEFAULT_MODEL_LIB_URL = `/web-llm/Qwen2-0.5B-Instruct-q4f16_1_cs1k-webgpu.wasm`;

// Cache API scopes used by web-llm. Nuking the whole scope is safer than
// deleting individual keys: a previous failed download can leave an empty
// shard entry behind that web-llm's own delete routine misses.
const WEBLLM_CACHE_SCOPES = [
  'webllm/model',
  'webllm/wasm',
  'webllm/config',
  'webllm/tokenizer',
  'tvmjs',
];

export interface LocalLLMOptions {
  /** Base URL of the model repo, e.g. an hf-mirror.com mirror of the MLC repo. */
  modelUrl?: string;
  /** Full URL of the WebGPU wasm library. */
  modelLibUrl?: string;
}

/**
 * Build the web-llm model record used for the download. Defaults point to
 * sources that work from mainland China; options override them.
 */
export function buildModelRecord(
  options: LocalLLMOptions = {},
  origin = '',
): { model: string; model_id: string; model_lib: string } {
  return {
    // web-llm's cleanModelUrl() calls `new URL(modelUrl)` without a base, so
    // the model URL MUST be absolute — resolve the default against the page
    // origin (falls back to the relative path outside a browser, e.g. tests).
    model: options.modelUrl ?? `${origin}${DEFAULT_MODEL_URL}`,
    model_id: MODEL_ID,
    model_lib: options.modelLibUrl ?? DEFAULT_MODEL_LIB_URL,
  };
}

/**
 * Global singleton keys. We store the web-llm module promise (and engine)
 * on `window` so they survive Vite HMR re-evaluations of this composable.
 *
 * A second import()/evaluation of @mlc-ai/web-llm registers a separate
 * embind runtime (Tokenizer, VectorInt, etc.), and handles from one instance
 * fail inside the other with "Expected null or instance of Tokenizer, got an
 * instance of Tokenizer". Keeping exactly one module instance is required.
 */
const GLOBAL_MODULE_KEY = '__vibe_webllm_module__';
const GLOBAL_ENGINE_KEY = '__vibe_webllm_engine__';
const GLOBAL_MODULE_LOADING_KEY = '__vibe_webllm_module_loading__';

interface VibeWebLLMGlobal {
  [GLOBAL_MODULE_KEY]?: WebLLMModule;
  [GLOBAL_MODULE_LOADING_KEY]?: Promise<WebLLMModule>;
  [GLOBAL_ENGINE_KEY]?: any;
}

function getGlobal(): VibeWebLLMGlobal | undefined {
  if (typeof window === 'undefined') return undefined;
  return window as unknown as VibeWebLLMGlobal;
}

export async function getWebLLMModule(): Promise<WebLLMModule> {
  const g = getGlobal();

  // Already resolved module takes precedence.
  if (g?.[GLOBAL_MODULE_KEY]) return g[GLOBAL_MODULE_KEY];

  // If another call/import is in flight, share its promise.
  if (g?.[GLOBAL_MODULE_LOADING_KEY]) return g[GLOBAL_MODULE_LOADING_KEY];

  const loading = import('@mlc-ai/web-llm').then((m) => {
    if (g) {
      g[GLOBAL_MODULE_KEY] = m;
      delete g[GLOBAL_MODULE_LOADING_KEY];
    }
    console.log('[web-llm] module loaded (global singleton)');
    return m;
  });

  if (g) {
    g[GLOBAL_MODULE_LOADING_KEY] = loading;
  }
  return loading;
}

// Decline HMR for this module: a hot-replaced singleton would reset the global
// state and could create a second embind runtime. Force a full reload instead.
if (import.meta.hot) {
  import.meta.hot.decline();
}

// ── Module-level singleton so state persists across page navigations ──
// Previously every call to useLocalLLM() created new refs, so navigating
// away from /chat (SPA navigation) and back reset state to 'idle', making
// it seem like the model needed re-downloading even though WebLLM caches
// everything in IndexedDB. Now the refs live outside the function and are
// shared by all callers during the app's lifetime.
// NOTE: engine must NOT be stored in a Vue ref. Refs deeply proxy their
// values, and the WebLLM WASM engine/Tokenizer objects cannot survive being
// wrapped by Vue's reactivity system. A plain `let` keeps the exact same
// object across the whole app lifetime, which is also the fix documented in
// https://github.com/mlc-ai/web-llm/issues/732.
let _engine: any = getGlobal()?.[GLOBAL_ENGINE_KEY] ?? null;
const _modelState = ref<ModelState>('idle');
const _downloadProgress = ref(0);
const _downloadText = ref('');
const _errorMessage = ref('');
const _canUse = ref(false);
const _downloadElapsed = ref(0);
let _elapsedTimer: ReturnType<typeof setInterval> | null = null;

// If an engine was already created before this module evaluation (e.g. before
// a Vite HMR reload), restore the ready state so the UI stays consistent.
if (import.meta.client && _engine) {
  _modelState.value = 'ready';
}

/**
 * Reset all local LLM state. Intended for unit tests only; production code
 * should rely on the global singleton lifecycle.
 */
export function resetLocalLLMForTesting(): void {
  stopElapsedTimerInternal();
  _modelState.value = 'idle';
  _downloadProgress.value = 0;
  _downloadText.value = '';
  _errorMessage.value = '';
  _canUse.value = false;
  _downloadElapsed.value = 0;
  _engine = null;
  const g = getGlobal();
  if (g) {
    delete g[GLOBAL_ENGINE_KEY];
    delete g[GLOBAL_MODULE_KEY];
    delete g[GLOBAL_MODULE_LOADING_KEY];
  }
}

function stopElapsedTimerInternal(): void {
  if (_elapsedTimer !== null) {
    clearInterval(_elapsedTimer);
    _elapsedTimer = null;
  }
  _downloadElapsed.value = 0;
}

export function useLocalLLM() {
  const modelState = _modelState;
  const downloadProgress = _downloadProgress;
  const downloadText = _downloadText;
  const errorMessage = _errorMessage;
  // Expose the non-reactive engine singleton through a computed so callers can
  // read it with `.value` without actually wrapping the WASM engine in a ref.
  const engine = computed(() => _engine);
  const canUse = _canUse;
  const downloadElapsed = _downloadElapsed;
  const elapsedTimer = () => _elapsedTimer;

  function startElapsedTimer() {
    _downloadElapsed.value = 0;
    _elapsedTimer = setInterval(() => {
      _downloadElapsed.value += 1;
    }, 1000);
  }

  function stopElapsedTimer() {
    stopElapsedTimerInternal();
  }

  async function clearCacheScopes(): Promise<void> {
    try {
      if (typeof caches !== 'undefined') {
        await Promise.all(
          WEBLLM_CACHE_SCOPES.map((scope) => caches.delete(scope)),
        );
      }
    } catch (e: any) {
      console.error('[clearCacheScopes] error:', e.message || e);
    }
  }

  // Check WebGPU support (don't rely on navigator.deviceMemory)
  function checkCapabilities(): boolean {
    if (!import.meta.client) return false;
    return supportsWebGPU();
  }

  async function init() {
    if (!import.meta.client) return;
    canUse.value = checkCapabilities();
  }

  async function loadModel(options?: LocalLLMOptions, _retried = false) {
    if (!import.meta.client) return;
    console.log('[loadModel] called, current state:', modelState.value);
    if (modelState.value === 'ready') return;
    if (modelState.value === 'downloading') return;

    // Re-check capabilities on every attempt (init() may not have run yet).
    canUse.value = supportsWebGPU();
    if (!canUse.value) {
      modelState.value = 'error';
      errorMessage.value =
        '当前浏览器不支持 WebGPU，无法运行本地模型（WebLLM 需要 WebGPU）。' +
        '请使用最新版 Chrome / Edge 并确认已开启 WebGPU。';
      return;
    }

    modelState.value = 'downloading';
    downloadProgress.value = 0;
    errorMessage.value = '';
    startElapsedTimer();

    try {
      // Unload any previous engine first so its wasm/tokenizer handles are
      // released before a new runtime instance is created.
      if (_engine) {
        try {
          await _engine.unload?.();
        } catch (unloadErr) {
          console.warn('[loadModel] failed to unload previous engine:', unloadErr);
        }
        _engine = null;
      }

      console.log('[loadModel] resolving @mlc-ai/web-llm...');
      const webllm = await getWebLLMModule();
      console.log('[loadModel] web-llm module ready');

      // On the first attempt, only clear stale cache when there is no usable
      // model cache yet. If the model is already cached we want to keep it so
      // WebLLM can resume an interrupted download instead of starting over.
      // The global web-llm singleton (see above) is what prevents Tokenizer
      // conflicts; this cache check only avoids redundant re-downloads.
      if (!_retried) {
        let hasCache = false;
        try {
          hasCache = await webllm.hasModelInCache(MODEL_ID);
        } catch { /* ignore */ }
        if (!hasCache) {
          try {
            await webllm.deleteModelAllInfoInCache(MODEL_ID);
            console.log('[loadModel] no cached model, cleared stale cache');
          } catch { /* ignore */ }
          await clearCacheScopes();
        } else {
          console.log('[loadModel] found existing model cache, will reuse');
        }
      }

      console.log('[loadModel] creating engine...');
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const modelRecord = buildModelRecord(options, origin);
      const engineConfig: Record<string, unknown> = {
        initProgressCallback: (report: { progress: number; text: string }) => {
          downloadProgress.value = report.progress;
          downloadText.value = report.text;
        },
        appConfig: { model_list: [modelRecord] },
      };
      const createdEngine = await webllm.CreateMLCEngine(
        MODEL_ID,
        engineConfig,
      );

      _engine = createdEngine;
      const g = getGlobal();
      if (g) g[GLOBAL_ENGINE_KEY] = createdEngine;
      stopElapsedTimer();
      modelState.value = 'ready';
      console.log('[loadModel] engine ready!');
    } catch (e: any) {
      console.error('[loadModel] error:', e.message || e);
      stopElapsedTimer();
      modelState.value = 'error';
      errorMessage.value = e.message || 'Failed to load local model';
      const corruptedCache =
        /Program terminated|exit\(\d+\)|size mismatch|TensorCopyFromBytes|Tokenizer|upcastPointer|auto conversion pool/.test(
          errorMessage.value,
        );
      const retriableNetwork =
        /Failed to execute 'add' on 'Cache'|Request failed|NetworkError|Failed to fetch|fetch failed|Upstream fetch failed|Upstream error|502|503|504/.test(
          errorMessage.value,
        );
      if (!_retried && (corruptedCache || retriableNetwork)) {
        if (corruptedCache) {
          // A previous failed download may have cached empty shard entries that
          // cause Tokenizer conflicts on the next attempt. Nuke the web-llm
          // model cache and try once more with a clean slate.
          console.log('[loadModel] cache corruption detected, clearing and retrying...');
          try {
            const webllm = await getWebLLMModule();
            await webllm.deleteModelAllInfoInCache(MODEL_ID);
          } catch {} // silently ignore cleanup failures
          await clearCacheScopes();
        } else {
          console.log('[loadModel] download/network error, retrying once...');
        }
        return loadModel(options, true);
      }
      if (/Program terminated|exit\(\d+\)/.test(errorMessage.value)) {
        errorMessage.value +=
          ' 常见原因：模型缓存损坏或显卡显存不足。' +
          '请点“清除缓存并重试”，或关闭占用显存的程序后重试。';
      }
      if (/Tokenizer|upcastPointer|auto conversion pool/.test(errorMessage.value)) {
        errorMessage.value +=
          ' 检测到 WebLLM 运行时重复加载，请点“清除缓存并刷新重试”以整页刷新。';
      }
    }
  }

  async function clearModelCache(): Promise<boolean> {
    if (!import.meta.client) return true;
    try {
      const webllm = await getWebLLMModule();
      await webllm.deleteModelAllInfoInCache(MODEL_ID);
    } catch (e: any) {
      console.error('[clearModelCache] error:', e.message || e);
    }
    await clearCacheScopes();
    return true;
  }

  async function* chat(messages: Array<{ role: string; content: string }>): AsyncGenerator<string> {
    if (!_engine || modelState.value !== 'ready') {
      throw new Error('Local model not ready');
    }

    const startTime = Date.now();
    const reply = await _engine.chat.completions.create({
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

  async function unload() {
    stopElapsedTimer();
    if (_engine) {
      try {
        await _engine.unload?.();
      } catch (e: any) {
        console.warn('[unload] failed to unload engine:', e.message || e);
      }
      _engine = null;
    }
    const g = getGlobal();
    if (g) delete g[GLOBAL_ENGINE_KEY];
    _modelState.value = 'idle';
    _downloadProgress.value = 0;
  }

  return {
    modelState,
    downloadProgress,
    downloadText,
    errorMessage,
    downloadElapsed,
    canUse,
    engine,
    init,
    loadModel,
    clearModelCache,
    chat,
    unload,
    clearCacheScopes,
  };
}
