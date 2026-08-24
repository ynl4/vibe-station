import { describe, it, expect } from 'vitest';
import { buildModelUpstreamUrl } from './llm-model';

const MODEL_ID = 'Qwen2-0.5B-Instruct-q4f16_1-MLC';

describe('buildModelUpstreamUrl', () => {
  it('maps a model file path to the default hf-mirror upstream', () => {
    const url = buildModelUpstreamUrl(
      `${MODEL_ID}/resolve/main/mlc-chat-config.json`,
    );
    expect(url).toBe(
      `https://hf-mirror.com/mlc-ai/${MODEL_ID}/resolve/main/mlc-chat-config.json`,
    );
  });

  it('uses a custom upstream base when provided', () => {
    const url = buildModelUpstreamUrl(
      `${MODEL_ID}/resolve/main/params_shard_0.bin`,
      'https://huggingface.co',
    );
    expect(url).toBe(
      `https://huggingface.co/mlc-ai/${MODEL_ID}/resolve/main/params_shard_0.bin`,
    );
  });

  it('works with any WebLLM model id', () => {
    expect(
      buildModelUpstreamUrl(
        'Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json',
      ),
    ).toBe(
      'https://hf-mirror.com/mlc-ai/Phi-3-mini-4k-instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json',
    );
    expect(
      buildModelUpstreamUrl(
        'Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin',
      ),
    ).toBe(
      'https://hf-mirror.com/mlc-ai/Qwen2.5-1.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin',
    );
  });

  it('returns null for paths outside the resolve/main tree', () => {
    expect(buildModelUpstreamUrl('other-model/raw/main/x.bin')).toBeNull();
    expect(buildModelUpstreamUrl(`${MODEL_ID}/raw/main/x.bin`)).toBeNull();
    expect(buildModelUpstreamUrl('')).toBeNull();
    expect(buildModelUpstreamUrl(`${MODEL_ID}/resolve/main/`)).toBeNull();
  });
});
