// Chat
export interface ChatSession {
  id: number;
  title: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  sessionId: number;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  provider?: 'local' | 'cloud';
  latencyMs?: number;
  createdAt: Date;
}
