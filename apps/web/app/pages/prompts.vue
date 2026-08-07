<template>
  <div class="flex h-[calc(100vh-6rem)] -mx-6 -my-8">
    <!-- Left: Template Library -->
    <aside class="w-64 border-r border-gray-800 flex flex-col shrink-0">
      <div class="p-3 border-b border-gray-800">
        <button
          class="w-full text-sm px-3 py-2 rounded-md bg-purple-600 hover:bg-purple-500 transition-colors"
          @click="startNew"
        >
          {{ t('prompts.new') }}
        </button>
      </div>

      <!-- Category filter -->
      <div class="px-3 py-2 border-b border-gray-800 flex gap-1 flex-wrap">
        <button
          v-for="cat in ['all', 'coding', 'writing', 'analysis', 'review']"
          :key="cat"
          class="text-xs px-2 py-0.5 rounded transition-colors"
          :class="filterCat === cat ? 'bg-purple-900/50 text-purple-400' : 'text-gray-500 hover:text-gray-300'"
          @click="filterCat = cat"
        >{{ cat === 'all' ? t('prompts.filterAll') : cat }}</button>
      </div>

      <div class="flex-1 overflow-y-auto p-2 space-y-1">
        <button
          v-for="t in filteredTemplates"
          :key="t.id"
          class="w-full text-left px-3 py-2 rounded-md text-sm transition-colors"
          :class="selectedId === t.id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-900'"
          @click="select(t.id); loadRuns(t.id)"
        >
          <div class="truncate">{{ t.title }}</div>
          <div class="text-xs text-gray-600 mt-0.5">{{ t.category }} · {{ t.useCount }} uses</div>
        </button>
        <div v-if="filteredTemplates.length === 0" class="text-xs text-gray-600 text-center py-4">
          {{ t('prompts.noRecords') }}
        </div>
      </div>
    </aside>

    <!-- Center: Editor -->
    <div class="w-96 border-r border-gray-800 flex flex-col shrink-0 overflow-y-auto p-4 space-y-4">
      <h3 class="text-sm font-semibold text-gray-400">
        {{ editingId ? t('prompts.edit') : t('prompts.new') }}
      </h3>

      <input
        v-model="form.title"
        :placeholder="t('prompts.titleLabel')"
        class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white text-sm"
      />

      <select
        v-model="form.category"
        class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-white text-sm"
      >
        <option value="coding">coding</option>
        <option value="writing">writing</option>
        <option value="analysis">analysis</option>
        <option value="review">review</option>
      </select>

      <input
        v-model="form.tagsInput"
        :placeholder="t('prompts.tagsPlaceholder')"
        class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white text-sm"
      />

      <textarea
        v-model="form.template"
        :placeholder="t('prompts.templatePlaceholder')"
        rows="12"
        class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-purple-500 outline-none text-white text-sm font-mono resize-y"
      />

      <!-- Detected variables -->
      <div v-if="extractedVars.length > 0">
        <div class="text-xs text-gray-500 mb-1">{{ t('prompts.variables') }}:</div>
        <div class="flex gap-1 flex-wrap">
          <span v-for="v in extractedVars" :key="v" class="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">
            &#123;&#123;{{ v }}&#125;&#125;
          </span>
        </div>
      </div>

      <div class="flex gap-2">
        <button
          class="flex-1 py-2 rounded-md bg-purple-600 hover:bg-purple-500 disabled:opacity-50 transition-colors text-sm"
          :disabled="!form.title || !form.template"
          @click="handleSave"
        >{{ editingId ? t('prompts.update') : t('prompts.save') }}</button>
        <button
          v-if="editingId"
          class="px-3 py-2 rounded-md border border-red-800 text-red-400 hover:bg-red-900/30 transition-colors text-sm"
          @click="handleDelete"
        >Del</button>
        <button
          v-if="editingId"
          class="px-3 py-2 rounded-md border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors text-sm"
          @click="startNew"
        >New</button>
      </div>

      <div v-if="editorMsg" class="text-xs" :class="editorErr ? 'text-red-400' : 'text-green-400'">
        {{ editorMsg }}
      </div>
    </div>

    <!-- Right: Playground -->
    <div class="flex-1 flex flex-col min-w-0">
      <div v-if="!selectedTemplate" class="flex-1 flex items-center justify-center text-gray-600 text-sm">
        {{ t('prompts.noTemplate') }}
      </div>

      <div v-else class="flex-1 flex flex-col overflow-y-auto p-4 space-y-4">
        <h3 class="text-sm font-semibold text-gray-400">{{ t('prompts.playground') }} — {{ selectedTemplate.title }}</h3>

        <!-- Variable form -->
        <div
          v-for="v in extractVariables(selectedTemplate.template)"
          :key="v"
        >
          <label class="text-xs text-gray-500">{{ v }}</label>
          <input
            v-model="playVars[v]"
            :class="[
              'w-full mt-0.5 px-3 py-2 rounded-md border text-sm',
              runError && !playVars[v]?.trim()
                ? 'border-red-700 bg-red-900/20 text-red-300'
                : 'border-gray-700 bg-gray-900 text-white'
            ]"
            :placeholder="t('prompts.varPlaceholder').replace('{{var}}', v)"
          />
        </div>

        <div v-if="extractVariables(selectedTemplate.template).length === 0" class="text-xs text-gray-600">
          {{ locale === 'zh' ? '此模板无变量，可直接运行' : 'No variables in this template. Ready to run as-is.' }}
        </div>

        <!-- Rendered preview -->
        <details class="text-xs">
          <summary class="text-gray-500 cursor-pointer hover:text-gray-300">{{ t('prompts.preview') }}</summary>
          <pre class="mt-2 p-3 rounded bg-gray-900 text-gray-300 text-xs whitespace-pre-wrap font-mono">{{ renderedPreview }}</pre>
        </details>

        <!-- Run button -->
        <button
          class="py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 transition-colors text-sm font-medium"
          :disabled="running"
          @click="handleRun"
        >{{ running ? t('prompts.running') : '▶ ' + t('prompts.run') }}</button>

        <div v-if="runError" class="text-red-400 text-xs">{{ runError }}</div>

        <!-- Output -->
        <div v-if="runOutput" class="p-3 rounded bg-gray-900 text-sm whitespace-pre-wrap text-gray-200">
          {{ runOutput }}
          <span v-if="running" class="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-middle" />
        </div>

        <!-- Run history (bottom) -->
        <details v-if="runs.length > 0" class="border-t border-gray-800 pt-4">
          <summary class="text-sm text-gray-400 cursor-pointer hover:text-gray-200">
            {{ t('prompts.testRecords') }} ({{ runs.length }})
          </summary>
          <div class="mt-3 space-y-2">
            <div
              v-for="run in runs"
              :key="run.id"
              class="p-2 rounded bg-gray-900/50 text-xs"
            >
              <div class="flex items-center gap-2 text-gray-500">
                <span :class="run.status === 'success' ? 'text-green-400' : 'text-red-400'">
                  {{ run.status === 'success' ? '✓' : '✗' }}
                </span>
                <span>{{ run.model }}</span>
                <span v-if="run.latencyMs">· {{ (run.latencyMs / 1000).toFixed(1) }}s</span>
                <span v-if="run.outputTokenCount">· ~{{ run.outputTokenCount }} tok</span>
                <span class="text-gray-600">{{ formatDate(run.createdAt) }}</span>
              </div>
              <div class="mt-1 text-gray-600 font-mono truncate">
                vars: {{ JSON.stringify(run.variables) }}
              </div>
              <div class="mt-1 text-gray-400 line-clamp-2">{{ run.output.slice(0, 200) }}</div>
            </div>
          </div>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t, locale } = useI18n();
const {
  templates, selectedId, selectedTemplate,
  loadTemplates, save, remove, select,
  extractVariables, render,
  runs, loadRuns,
  authHeader,
} = usePrompts();

const filterCat = ref('all');
const filteredTemplates = computed(() => {
  if (filterCat.value === 'all') return templates.value;
  return templates.value.filter(t => t.category === filterCat.value);
});

// Editor form
const editingId = computed(() => selectedId.value);
const form = reactive({
  title: '',
  template: '',
  category: 'coding',
  tagsInput: '',
});
const editorMsg = ref('');
const editorErr = ref(false);

const extractedVars = computed(() => extractVariables(form.template));

function startNew() {
  select(null);
  form.title = '';
  form.template = '';
  form.category = 'coding';
  form.tagsInput = '';
  editorMsg.value = '';
  playVars.value = {};
  runOutput.value = '';
  runError.value = '';
}

async function handleSave() {
  const tags = form.tagsInput.split(',').map(t => t.trim()).filter(Boolean);
  try {
    const result = await save({
      id: editingId.value || undefined,
      title: form.title,
      template: form.template,
      category: form.category,
      tags,
    } as any);
    select(result.id);
    form.title = result.title;
    form.template = result.template;
    form.category = result.category;
    form.tagsInput = (result.tags || []).join(', ');
    editorMsg.value = 'Saved!';
    editorErr.value = false;
    setTimeout(() => editorMsg.value = '', 2000);
  } catch (e: any) {
    editorMsg.value = e.data?.statusMessage || 'Save failed';
    editorErr.value = true;
  }
}

async function handleDelete() {
  if (!editingId.value) return;
  await remove(editingId.value);
  startNew();
}

// Playground
const playVars = ref<Record<string, string>>({});
const running = ref(false);
const runOutput = ref('');
const runError = ref('');

const renderedPreview = computed(() => {
  if (!selectedTemplate.value) return '';
  return render(selectedTemplate.value.template, playVars.value);
});

async function handleRun() {
  if (!selectedId.value) return;
  runError.value = '';
  runOutput.value = '';

  // Validate
  const vars = extractVariables(selectedTemplate.value!.template);
  const missing = vars.filter(v => !playVars.value[v]?.trim());
  if (missing.length > 0) {
    runError.value = `Missing variables: ${missing.join(', ')}`;
    return;
  }

  running.value = true;
  try {
    const response = await fetch(`/api/prompts/${selectedId.value}/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeader,
      },
      body: JSON.stringify({ variables: playVars.value }),
    });

    if (!response.ok) {
      const err = await response.text();
      runError.value = `Run failed: ${err}`;
      running.value = false;
      return;
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(5).trim());
          if (parsed.content) runOutput.value += parsed.content;
        } catch { /* skip */ }
      }
    }

    // Reload runs
    await loadRuns(selectedId.value);
  } catch (e: any) {
    runError.value = `Run error: ${e.message}`;
  } finally {
    running.value = false;
  }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

onMounted(() => loadTemplates());
</script>
