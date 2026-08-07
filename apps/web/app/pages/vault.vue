<template>
  <div class="space-y-6">
    <!-- Header + Search -->
    <div class="flex items-center gap-3">
      <h2 class="text-2xl font-bold flex-1">{{ t('vault.title') }}</h2>
      <input
        v-model="search"
        :placeholder="t('vault.search')"
        class="px-3 py-2 rounded-md bg-gray-900 border border-gray-700 focus:border-green-500 outline-none text-sm w-48"
        @input="loadSnippets"
      />
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

        <!-- Empty state -->
        <div v-else class="text-gray-600 text-sm text-center py-12">
          {{ t('vault.selectHint') }}
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
const explaining = ref(false);

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

onMounted(() => loadSnippets());
</script>
