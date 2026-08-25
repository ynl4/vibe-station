export interface PromptTemplate {
  id: number;
  title: string;
  description: string | null;
  template: string;
  category: string;
  tags: string[];
  useCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PromptRun {
  id: number;
  promptId: number;
  variables: Record<string, string>;
  model: string;
  provider: string;
  output: string;
  outputTokenCount: number | null;
  outputTruncated: number;
  latencyMs: number | null;
  status: string;
  createdAt: string;
}

export function usePrompts() {
  const token = useRuntimeConfig().public.accessToken;
  const authHeader = { Authorization: `Bearer ${token}` };

  const templates = ref<PromptTemplate[]>([]);
  const selectedId = ref<number | null>(null);
  const selectedTemplate = computed(() =>
    templates.value.find(t => t.id === selectedId.value) || null
  );

  async function loadTemplates() {
    try {
      templates.value = await $fetch('/api/prompts', { headers: authHeader });
    } catch { /* ignore */ }
  }

  async function save(template: Partial<PromptTemplate> & { title: string; template: string }) {
    if (template.id) {
      const result = await $fetch(`/api/prompts/${template.id}`, {
        method: 'PATCH',
        headers: authHeader,
        body: template,
      });
      const idx = templates.value.findIndex(t => t.id === template.id);
      if (idx >= 0) templates.value[idx] = result;
      return result;
    } else {
      const result = await $fetch('/api/prompts', {
        method: 'POST',
        headers: authHeader,
        body: template,
      });
      templates.value.unshift(result);
      return result;
    }
  }

  async function remove(id: number) {
    await $fetch(`/api/prompts/${id}`, {
      method: 'DELETE',
      headers: authHeader,
    });
    templates.value = templates.value.filter(t => t.id !== id);
    if (selectedId.value === id) selectedId.value = null;
  }

  function select(id: number | null) {
    selectedId.value = id;
  }

  // Variable extraction
  const VAR_RE = /\{\{\s*([\w一-鿿]+)\s*\}\}/g;
  function extractVariables(template: string): string[] {
    const vars = new Set<string>();
    let match;
    while ((match = VAR_RE.exec(template)) !== null) {
      vars.add(match[1].trim());
    }
    VAR_RE.lastIndex = 0;
    return [...vars];
  }

  // Template rendering
  function render(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [k, v] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{\\s*${escapeRegex(k)}\\s*\\}\\}`, 'g'), v);
    }
    return result;
  }

  function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Run history
  const runs = ref<PromptRun[]>([]);
  async function loadRuns(promptId: number) {
    try {
      runs.value = await $fetch(`/api/prompts/${promptId}/runs`, { headers: authHeader });
    } catch { /* ignore */ }
  }

  return {
    templates, selectedId, selectedTemplate,
    loadTemplates, save, remove, select,
    extractVariables, render,
    runs, loadRuns,
    authHeader,
  };
}
