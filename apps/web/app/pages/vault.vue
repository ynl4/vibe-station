<template>
  <div class="space-y-6">
    <!-- Header + Search -->
    <div class="flex items-center gap-3">
      <h2 class="text-2xl font-bold flex-1">{{ t('vault.title') }}</h2>
      <input
        v-model="search"
        :placeholder="searchMode === 'semantic' ? t('vault.searchSemantic') : t('vault.search')"
        class="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm w-48"
        @input="loadSnippets"
      />
      <!-- Search mode toggle -->
      <button
        class="px-2 py-2 rounded-md text-xs border transition-colors shrink-0"
        :class="searchMode === 'semantic'
          ? 'border-blue-500 text-blue-400 bg-blue-900/30'
          : 'border-gray-700 text-gray-500 hover:border-gray-600'"
        :title="searchMode === 'semantic' ? t('vault.semanticMode') : t('vault.keywordMode')"
        @click="toggleSearchMode"
      >
        {{ searchMode === 'semantic' ? t('vault.searchAI') : t('vault.searchKeyword') }}
      </button>
      <select
        v-model="langFilter"
        class="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 text-sm"
        @change="loadSnippets"
      >
        <option value="">{{ t('vault.allLangs') }}</option>
        <option v-for="l in languages" :key="l" :value="l">{{ l }}</option>
      </select>
      <button
        class="px-4 py-2 rounded-md bg-green-600 hover:bg-green-500 transition-colors text-sm"
        @click="startNew"
      >{{ t('vault.new') }}</button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <!-- Snippet List -->
      <div class="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <div
          v-for="s in snippets"
          :key="s.id"
          class="p-4 rounded-lg border cursor-pointer transition-colors"
          :class="selectedId === s.id ? 'border-green-500 bg-gray-900' : 'border-gray-800 hover:border-gray-600'"
          @click="selectSnippet(s)"
        >
          <div class="flex items-center justify-between">
            <h3 class="font-semibold text-sm">{{ s.title }}</h3>
            <span class="text-xs text-gray-500">{{ s.language }}</span>
          </div>
          <p v-if="s.description" class="text-xs text-gray-500 mt-1 truncate">{{ s.description }}</p>
          <div class="flex gap-1 mt-2">
            <span v-for="t in (s.tags || [])" :key="t" class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{{ t }}</span>
          </div>
        </div>
        <div v-if="snippets.length === 0" class="text-gray-600 text-sm text-center py-8">
          {{ t('vault.noSnippets') }}
        </div>
        <!-- Backfill trigger (shown when snippets exist) -->
        <div v-if="snippets.length > 0" class="px-2 pt-2 border-t border-gray-800 mt-2">
          <button
            class="w-full text-xs text-gray-600 hover:text-blue-400 transition-colors py-1"
            @click="runBackfill"
          >
            {{ t('vault.backfillEmbeddings') }}
          </button>
          <p v-if="backfillStatus" class="text-xs text-gray-500 mt-1">{{ backfillStatus }}</p>
        </div>
      </div>

      <!-- Detail / Editor Panel -->
      <div class="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto">
        <!-- Edit Mode -->
        <template v-if="editing">
          <h3 class="text-sm font-semibold text-gray-400">{{ editId ? t('vault.editSnippet') : t('vault.newSnippet') }}</h3>
          <input v-model="form.title" :placeholder="t('vault.titleLabel')" class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm" />
          <input v-model="form.description" :placeholder="t('prompts.descriptionPlaceholder')" class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm" />
          <div class="flex gap-2">
            <input v-model="form.language" :placeholder="t('vault.language')" class="flex-1 px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm" />
            <input v-model="form.tagsInput" :placeholder="t('vault.tags')" class="flex-1 px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm" />
          </div>
          <textarea v-model="form.code" :placeholder="t('vault.codePlaceholder')" rows="15" class="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm font-mono resize-y" />
          <div class="flex gap-2">
            <button class="flex-1 py-2 rounded-md bg-green-600 hover:bg-green-500 disabled:opacity-50 text-sm" :disabled="!form.title || !form.code || !form.language" @click="handleSave">
              {{ editId ? t('vault.update') : t('vault.save') }}
            </button>
            <button class="px-4 py-2 rounded-md border border-gray-700 text-sm hover:bg-gray-800" @click="editing = false">{{ t('vault.cancel') }}</button>
          </div>
        </template>

        <!-- View Mode -->
        <template v-else-if="selected">
          <div class="flex items-center justify-between">
            <h3 class="font-bold text-lg">{{ selected.title }}</h3>
            <div class="flex gap-1">
              <button class="text-xs px-2 py-1 rounded border border-gray-700 hover:bg-gray-800" @click="startEdit">{{ t('vault.edit') }}</button>
              <button class="text-xs px-2 py-1 rounded border border-red-800 text-red-400 hover:bg-red-900/30" @click="handleDelete">{{ t('vault.delete') }}</button>
            </div>
          </div>
          <div class="flex gap-2 text-xs text-gray-500">
            <span>{{ selected.language }}</span>
            <span v-if="selected.tags?.length" class="flex gap-1">
              <span v-for="tag in selected.tags" :key="tag" class="px-1.5 py-0.5 rounded bg-gray-800">{{ tag }}</span>
            </span>
          </div>
          <p v-if="selected.description" class="text-sm text-gray-400">{{ selected.description }}</p>

          <!-- Code -->
          <pre class="p-4 rounded-lg bg-gray-900 text-sm font-mono text-gray-200 overflow-x-auto"><code>{{ selected.code }}</code></pre>

          <!-- AI Explanation -->
          <div v-if="selected.explanation || explaining" class="p-4 rounded-lg bg-gray-900/50 border border-gray-800">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs text-gray-500">{{ t('vault.explanation') }}</span>
              <button v-if="!selected.explanation && !explaining" class="text-xs text-blue-400 hover:underline" @click="requestExplain">{{ t('vault.explainGenerate') }}</button>
            </div>
            <div v-if="explaining" class="text-sm text-gray-500">{{ t('vault.explaining') }}</div>
            <div v-else class="text-sm text-gray-300 whitespace-pre-wrap">{{ selected.explanation }}</div>
          </div>
          <button v-else class="text-sm text-blue-400 hover:underline" @click="requestExplain">{{ t('vault.explainGenerate') }}</button>
        </template>

        <!-- Guide / Empty state (shown when no snippet selected and not editing) -->
        <div v-else class="space-y-6">
          <div class="p-5 rounded-lg border border-green-800/50 bg-green-900/10 space-y-4">
            <h3 class="text-sm font-semibold text-green-300 flex items-center gap-2">
              <span class="text-lg">💡</span>
              {{ t('vault.guideTitle') }}
            </h3>

            <!-- Step 1 -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-400">{{ t('vault.guideStep1Title') }}</h4>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('vault.guideStep1Desc') }}</p>
            </div>

            <!-- Step 2 -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-400">{{ t('vault.guideStep2Title') }}</h4>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('vault.guideStep2Desc') }}</p>
            </div>

            <!-- Step 3 -->
            <div class="space-y-2">
              <h4 class="text-xs font-semibold text-gray-400">{{ t('vault.guideStep3Title') }}</h4>
              <p class="text-xs text-gray-500 leading-relaxed">{{ t('vault.guideStep3Desc') }}</p>
            </div>

            <!-- Example snippets -->
            <div class="space-y-2 pt-2 border-t border-gray-800">
              <h4 class="text-xs font-semibold text-green-400">
                {{ t('vault.guideExamples') }}
              </h4>
              <div class="space-y-2">
                <button
                  v-for="ex in vaultExamples"
                  :key="ex.title"
                  class="w-full text-left p-3 rounded-md bg-gray-900 border border-gray-800 hover:border-green-500/50 transition-colors group"
                  @click="useVaultExample(ex)"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm text-gray-300 group-hover:text-white transition-colors">{{ ex.title }}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{{ ex.language }}</span>
                  </div>
                  <p class="text-xs text-gray-500 mt-1 line-clamp-1">{{ ex.description }}</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
const token = useRuntimeConfig().public.accessToken;
const authHeader = { Authorization: `Bearer ${token}` };

const snippets = ref<any[]>([]);
const selected = ref<any>(null);
const selectedId = ref<number | null>(null);
const editing = ref(false);
const editId = ref<number | null>(null);
const search = ref('');
const langFilter = ref('');
const searchMode = ref<'keyword' | 'semantic'>('keyword');
const explaining = ref(false);

function toggleSearchMode() {
  searchMode.value = searchMode.value === 'keyword' ? 'semantic' : 'keyword';
  loadSnippets();
}

// Example snippets for the guide (reactive to locale)
const { locale } = useI18n();
const vaultExamples = computed(() => {
  const zh = locale.value === 'zh';
  return [
    {
      title: zh ? 'HTTP 服务器 (Node.js)' : 'HTTP Server (Node.js)',
      language: 'typescript',
      description: zh ? '基于 Node.js http 模块的简单 HTTP 服务器' : 'A simple HTTP server using Node.js http module',
      code: zh
        ? `import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});`
        : `import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\\n');
});

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000/');
});`,
      tags: 'http,server,node.js',
    },
    {
      title: zh ? 'React useState 示例' : 'React useState Example',
      language: 'typescript',
      description: zh ? 'React 函数组件中使用 useState Hook' : 'Using useState Hook in a React function component',
      code: `import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(0)}>Reset</button>
    </div>
  );
}`,
      tags: 'react,hooks,useState',
    },
    {
      title: zh ? 'SQL 建表语句' : 'SQL Table Creation',
      language: 'sql',
      description: zh ? '创建用户表的标准 SQL，含主键和时间戳' : 'Standard SQL for creating a users table with PK and timestamps',
      code: `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);`,
      tags: 'sql,ddl,table',
    },
  ];
});

function useVaultExample(ex: typeof vaultExamples.value[number]) {
  editing.value = true;
  editId.value = null;
  selected.value = null;
  selectedId.value = null;
  form.title = ex.title;
  form.description = ex.description;
  form.language = ex.language;
  form.tagsInput = ex.tags;
  form.code = ex.code;
}

const languages = computed(() => {
  const langs = new Set(snippets.value.map((s: any) => s.language).filter(Boolean));
  return [...langs].sort();
});

const form = reactive({
  title: '', description: '', language: '', tagsInput: '', code: '',
});

async function loadSnippets() {
  const params = new URLSearchParams();
  if (search.value) params.set('search', search.value);
  if (langFilter.value) params.set('language', langFilter.value);
  if (searchMode.value === 'semantic' && search.value) {
    params.set('mode', 'semantic');
  }
  try {
    snippets.value = await $fetch(`/api/snippets?${params}`, { headers: authHeader });
  } catch { /* ignore */ }
}

function selectSnippet(s: any) {
  selected.value = s;
  selectedId.value = s.id;
  editing.value = false;
}

function startNew() {
  editing.value = true;
  editId.value = null;
  selected.value = null;
  selectedId.value = null;
  form.title = ''; form.description = ''; form.language = '';
  form.tagsInput = ''; form.code = '';
}

function startEdit() {
  if (!selected.value) return;
  editing.value = true;
  editId.value = selected.value.id;
  form.title = selected.value.title;
  form.description = selected.value.description || '';
  form.language = selected.value.language;
  form.tagsInput = (selected.value.tags || []).join(', ');
  form.code = selected.value.code;
}

async function handleSave() {
  const tags = form.tagsInput.split(',').map((t: string) => t.trim()).filter(Boolean);
  const body = { title: form.title, description: form.description, language: form.language, code: form.code, tags };
  if (editId.value) {
    await $fetch(`/api/snippets/${editId.value}`, { method: 'PATCH', headers: authHeader, body });
  } else {
    await $fetch('/api/snippets', { method: 'POST', headers: authHeader, body });
  }
  editing.value = false;
  await loadSnippets();
  if (editId.value) {
    const updated = snippets.value.find((s: any) => s.id === editId.value);
    if (updated) selectSnippet(updated);
  }
}

async function handleDelete() {
  if (!selectedId.value) return;
  await $fetch(`/api/snippets/${selectedId.value}`, { method: 'DELETE', headers: authHeader });
  selected.value = null; selectedId.value = null;
  await loadSnippets();
}

async function requestExplain() {
  if (!selected.value) return;
  explaining.value = true;
  try {
    const result = await $fetch('/api/explain', {
      method: 'POST',
      headers: authHeader,
      body: { code: selected.value.code, language: selected.value.language },
    });
    await $fetch(`/api/snippets/${selected.value.id}`, {
      method: 'PATCH',
      headers: authHeader,
      body: { explanation: result.explanation },
    });
    selected.value.explanation = result.explanation;
  } catch (e: any) {
    // keep going without explanation
  } finally {
    explaining.value = false;
  }
}

// Backfill embeddings for existing snippets
const backfillStatus = ref('');
async function runBackfill() {
  backfillStatus.value = t('vault.backfillProcessing');
  try {
    const res = await $fetch('/api/snippets/backfill', { method: 'POST', headers: authHeader });
    backfillStatus.value = t('vault.backfillDone')
      .replace('{processed}', String(res.processed))
      .replace('{failed}', String(res.failed));
  } catch (e: any) {
    backfillStatus.value = `Error: ${e.data?.statusMessage || e.message}`;
  }
}

onMounted(() => loadSnippets());
</script>
