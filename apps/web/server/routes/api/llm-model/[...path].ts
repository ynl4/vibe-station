import { buildModelUpstreamUrl } from '../../../utils/llm-model';

/**
 * Streams WebLLM model files (mlc-chat-config.json, tokenizer, weights, ...)
 * from the configured upstream, so the browser never hits CORS or blocked
 * hosts. Upstream defaults to hf-mirror.com; override with
 * LOCAL_LLM_UPSTREAM_URL.
 */
export default defineEventHandler(async (event) => {
  const rest = event.context.params?.path || '';
  const upstreamBase = process.env.LOCAL_LLM_UPSTREAM_URL || undefined;
  const upstream = buildModelUpstreamUrl(rest, upstreamBase);
  if (!upstream) {
    throw createError({ statusCode: 404, statusMessage: 'Not found' });
  }

  const range = getHeader(event, 'range');
  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(upstream, {
      redirect: 'follow',
      headers: range ? { range } : undefined,
    });
  } catch (err: any) {
    // Network-level failures (ECONNRESET, ETIMEDOUT, DNS failures, ...) would
    // otherwise bubble up as a generic 500. Surface them as 502/504 so the
    // client (and WebLLM's CacheStorage) sees a retryable transport error.
    console.error(
      `[llm-model] upstream fetch failed for ${rest}:`,
      err?.message || err,
    );
    throw createError({
      statusCode: 502,
      statusMessage: `Upstream fetch failed: ${err?.message || err}`,
    });
  }

  if (!upstreamRes.ok) {
    console.error(
      `[llm-model] upstream returned ${upstreamRes.status} for ${rest}`,
    );
    throw createError({
      statusCode: 502,
      statusMessage: `Upstream error: ${upstreamRes.status}`,
    });
  }

  for (const name of [
    'content-type',
    'content-length',
    'content-range',
    'accept-ranges',
    'etag',
    'cache-control',
    'last-modified',
  ]) {
    const value = upstreamRes.headers.get(name);
    if (value) setHeader(event, name, value);
  }
  setResponseStatus(event, upstreamRes.status);
  return sendStream(event, upstreamRes.body);
});
