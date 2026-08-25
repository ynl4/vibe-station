export type AIProvider = 'deepseek' | 'qwen-local';

export interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model: string;
  provider: AIProvider;
  stream?: boolean;
}

export interface ChatChunk {
  content: string;
  done: boolean;
}

export interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model: string;
}
