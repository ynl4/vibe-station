import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as webllm from '@mlc-ai/web-llm';
import {
  useLocalLLM,
  supportsWebGPU,
  buildModelRecord,
  MODEL_ID,
  resetLocalLLMForTesting,
} from '../app/composables/useLocalLLM';

vi.mock('@mlc-ai/web-llm', () => ({
  hasModelInCache: vi.fn(async () => false),
  deleteModelAllInfoInCache: vi.fn(async () => {}),
  CreateMLCEngine: vi.fn(),
}));

const mockEngine = {
  chat: {
    completions: {
      create: vi.fn(),
    },
  },
};

describe('supportsWebGPU', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when navigator.gpu is unavailable', () => {
    vi.stubGlobal('navigator', {});
    expect(supportsWebGPU()).toBe(false);
  });

  it('returns true when navigator.gpu is available', () => {
    vi.stubGlobal('navigator', { gpu: {} });
    expect(supportsWebGPU()).toBe(true);
  });
});

describe('buildModelRecord', () => {
  it('uses working defaults (server proxy + bundled wasm) when no overrides are set', () => {
    const record = buildModelRecord();
    expect(record).not.toBeNull();
    expect(record!.model_id).toBe(MODEL_ID);
    expect(record!.model).toMatch(/^\/api\/llm-model\//);
    expect(record!.model_lib).toMatch(/^\/web-llm\/.*\.wasm$/);
  });

  it('keeps the bundled model library when only the model URL is overridden', () => {
    const record = buildModelRecord({
      modelUrl: 'https://example-mirror.com/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC',
    });
    expect(record).not.toBeNull();
    expect(record!.model_id).toBe(MODEL_ID);
    expect(record!.model).toContain('example-mirror.com');
    expect(record!.model_lib).toMatch(/^\/web-llm\/.*\.wasm$/);
  });

  it('overrides both the model and the library URLs when provided', () => {
    const record = buildModelRecord({
      modelUrl: 'https://example-mirror.com/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC',
      modelLibUrl:
        'https://example.com/web-llm-models/v0_2_84/base/Phi-3-mini-4k-instruct-q4f16_1_cs1k-webgpu.wasm',
    });
    expect(record!.model).toContain('example-mirror.com');
    expect(record!.model_lib).toContain('example.com');
  });

  it('resolves the default model URL to absolute when an origin is provided', () => {
    const record = buildModelRecord({}, 'http://localhost:3000');
    expect(record!.model).toBe(
      `http://localhost:3000/api/llm-model/${MODEL_ID}`,
    );
  });
});

describe('useLocalLLM', () => {
  beforeEach(() => {
    resetLocalLLMForTesting();
    vi.stubGlobal('navigator', { gpu: {} });
    vi.mocked(webllm.CreateMLCEngine).mockReset();
    vi.mocked(webllm.hasModelInCache).mockReset();
    vi.mocked(webllm.hasModelInCache).mockResolvedValue(false);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports download progress and becomes ready after engine init', async () => {
    let resolveEngine!: (engine: unknown) => void;
    vi.mocked(webllm.CreateMLCEngine).mockImplementation(
      (_modelId: string, config: any) => {
        config.initProgressCallback({
          progress: 0.5,
          text: 'downloading weights',
        });
        return new Promise((resolve) => {
          resolveEngine = resolve;
        });
      },
    );

    const llm = useLocalLLM();
    const pending = llm.loadModel();

    expect(llm.modelState.value).toBe('downloading');
    await vi.waitFor(() => {
      expect(llm.downloadProgress.value).toBe(0.5);
      expect(llm.downloadText.value).toContain('downloading');
    });

    resolveEngine(mockEngine);
    await pending;

    expect(llm.modelState.value).toBe('ready');
    expect(llm.engine.value).toBeTruthy();
  });

  it('sets error state and keeps the message when engine creation fails', async () => {
    vi.mocked(webllm.CreateMLCEngine).mockRejectedValue(
      new Error('Failed to fetch model'),
    );

    const llm = useLocalLLM();
    await llm.loadModel();

    expect(llm.modelState.value).toBe('error');
    expect(llm.errorMessage.value).toBe('Failed to fetch model');
  });

  it('reports a clear error instead of downloading when WebGPU is unavailable', async () => {
    vi.stubGlobal('navigator', {});

    const llm = useLocalLLM();
    await llm.loadModel();

    expect(llm.modelState.value).toBe('error');
    expect(llm.errorMessage.value).toContain('WebGPU');
    expect(webllm.CreateMLCEngine).not.toHaveBeenCalled();
  });

  it('streams deltas and appends a metadata marker', async () => {
    const chunks = [
      { choices: [{ delta: { content: '你' } }] },
      { choices: [{ delta: { content: '好' } }] },
      { choices: [{ delta: {} }] },
    ];
    let i = 0;
    vi.mocked(webllm.CreateMLCEngine).mockResolvedValue({
      chat: {
        completions: {
          create: vi.fn(async () => ({
            [Symbol.asyncIterator]() {
              return {
                next: async () =>
                  i < chunks.length
                    ? { value: chunks[i++], done: false }
                    : { value: undefined, done: true },
              };
            },
          })),
        },
      },
    } as any);

    const llm = useLocalLLM();
    await llm.loadModel();

    const parts: string[] = [];
    for await (const part of llm.chat([{ role: 'user', content: 'hi' }])) {
      parts.push(part);
    }

    expect(parts.slice(0, 2)).toEqual(['你', '好']);
    expect(parts[2]).toMatch(/^__META__/);
  });

  it('tracks elapsed download time and stops after completion', async () => {
    vi.useFakeTimers();
    let resolveEngine!: (engine: unknown) => void;
    vi.mocked(webllm.CreateMLCEngine).mockImplementation(
      () => new Promise((resolve) => {
        resolveEngine = resolve;
      }),
    );

    const llm = useLocalLLM();
    const pending = llm.loadModel();

    await vi.advanceTimersByTimeAsync(3000);
    expect(llm.downloadElapsed.value).toBe(3);

    resolveEngine(mockEngine);
    await pending;
    await vi.advanceTimersByTimeAsync(2000);
    expect(llm.downloadElapsed.value).toBe(0);
    vi.useRealTimers();
  });

  it('passes an absolute model URL resolved from the page origin', async () => {
    vi.stubGlobal('window', { location: { origin: 'http://localhost:3000' } });
    vi.mocked(webllm.CreateMLCEngine).mockResolvedValue(mockEngine);

    const llm = useLocalLLM();
    await llm.loadModel();

    expect(webllm.CreateMLCEngine).toHaveBeenCalledWith(
      MODEL_ID,
      expect.objectContaining({
        appConfig: {
          model_list: [
            expect.objectContaining({
              model: `http://localhost:3000/api/llm-model/${MODEL_ID}`,
            }),
          ],
        },
      }),
    );
  });

  it('clears the model cache on demand', async () => {
    vi.mocked(webllm.deleteModelAllInfoInCache).mockReset();
    vi.mocked(webllm.deleteModelAllInfoInCache).mockResolvedValue(undefined as any);

    const llm = useLocalLLM();
    const ok = await llm.clearModelCache();

    expect(ok).toBe(true);
    expect(webllm.deleteModelAllInfoInCache).toHaveBeenCalledWith(MODEL_ID);
  });

  it('adds a fix hint when the wasm runtime aborts', async () => {
    vi.mocked(webllm.CreateMLCEngine).mockRejectedValue(
      new Error('Program terminated with exit(1)'),
    );

    const llm = useLocalLLM();
    await llm.loadModel();

    expect(llm.modelState.value).toBe('error');
    expect(llm.errorMessage.value).toContain('exit(1)');
    expect(llm.errorMessage.value).toContain('清除缓存并重试');
  });

  it('recovers from a corrupted cache by clearing and retrying once', async () => {
    vi.mocked(webllm.CreateMLCEngine)
      .mockRejectedValueOnce(new Error('Program terminated with exit(1)'))
      .mockResolvedValueOnce(mockEngine);

    const llm = useLocalLLM();
    await llm.loadModel();

    expect(webllm.CreateMLCEngine).toHaveBeenCalledTimes(2);
    expect(llm.modelState.value).toBe('ready');
  });
});
