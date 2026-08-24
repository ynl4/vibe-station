export interface Snippet {
  id: number;
  title: string;
  description: string | null;
  code: string;
  language: string;
  explanation: string | null;
  tags: string[];
  embedding?: number[] | null;
  createdAt: Date;
}
