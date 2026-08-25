export interface Prompt {
  id: number;
  title: string;
  description: string | null;
  template: string;
  category: 'coding' | 'writing' | 'analysis' | 'review';
  tags: string[];
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PromptRun {
  id: number;
  promptId: number;
  variables: Record<string, string>;
  model: string;
  provider: 'local' | 'cloud';
  output: string;
  outputTokenCount: number | null;
  outputTruncated: number;
  latencyMs: number | null;
  status: 'success' | 'error';
  createdAt: Date;
}
