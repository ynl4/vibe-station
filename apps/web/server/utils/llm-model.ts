/**
 * Server-side proxy for the local WebLLM model download.
 *
 * The browser cannot fetch the model weights directly from hf-mirror.com
 * (its redirect chain does not pass CORS for cross-origin fetches) and
 * huggingface.co is frequently unreachable from mainland China. Nitro
 * proxies the files same-origin, so the browser only talks to this app.
 */
export const DEFAULT_LLM_UPSTREAM_BASE = 'https://hf-mirror.com';

/**
 * Build the upstream URL for a model file request.
 * `rest` is everything after `/api/llm-model/`, e.g.
 * `Qwen2-0.5B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json`.
 *
 * The proxy accepts any `{modelId}/resolve/main/{file}` path so the same
 * server route works regardless of which model the client (useLocalLLM.ts) is
 * configured to load. Only the `/resolve/main/` tree is exposed to avoid
 * leaking raw repo contents.
 */
export function buildModelUpstreamUrl(
  rest: string,
  upstreamBase: string = DEFAULT_LLM_UPSTREAM_BASE,
): string | null {
  // Match: {modelId}/resolve/main/{file}
  // modelId allows HF-style names: alphanumerics, -, _, .
  const match = /^[A-Za-z0-9_.-]+\/resolve\/main\/.+/.exec(rest);
  if (!match) return null;
  return `${upstreamBase}/mlc-ai/${rest}`;
}
