/**
 * Lightweight i18n composable — zh/en switching with localStorage persistence.
 * No dependency on @nuxtjs/i18n.
 */

export type Locale = 'zh' | 'en';

const LOCALE_KEY = 'vibe-locale';

// ── Translation dictionaries ──────────────────────────────────
const messages: Record<Locale, Record<string, string>> = {
  zh: {
    // Nav
    'nav.home': '首页',
    'nav.chat': 'AI Chat',
    'nav.prompts': 'Prompt Studio',
    'nav.vault': 'Code Vault',
    'nav.blog': '博客',
    'nav.showcase': 'Showcase',

    // Home
    'home.title': 'Vibe Station',
    'home.subtitle': '个人 AI Developer Workspace — AI 驱动开发的全流程工具站',
    'home.chat.desc': '双模型对话 · 消息级切换',
    'home.prompts.desc': '模板管理 · 变量校验 · 测试追踪',
    'home.vault.desc': '代码片段 · AI 智能解释',
    'home.blog.desc': 'Vibe Coding 开发日志',
    'home.showcase.desc': 'EdgeGallery 端侧 AI 项目',
    'home.newPost': '+ 写文章',
    'home.repos': '仓库',
    'home.stars': '星标',
    'home.followers': '关注者',
    'home.following': '关注中',
    'home.recentRepos': '近期仓库',
    'home.statsUnavailable': 'GitHub 统计数据暂不可用',
    'home.langLabel': '语言',

    // Chat
    'chat.title': 'AI Chat',
    'chat.newSession': '+ 新对话',
    'chat.sessions': '会话列表',
    'chat.cloud': '云端',
    'chat.local': '本地',
    'chat.typePlaceholder': '输入消息...',
    'chat.send': '发送',
    'chat.downloadModel': '下载模型',
    'chat.modelDownloading': '模型下载中...',
    'chat.localNotReady': '本地模型未就绪，请先下载',
    'chat.switchCloud': '切换云端',
    'chat.switchLocal': '切换本地',
    'chat.deleteSession': '删除',

    // Prompts
    'prompts.title': 'Prompt Studio',
    'prompts.templates': '模板库',
    'prompts.new': '+ 新建模板',
    'prompts.edit': '编辑模板',
    'prompts.titleLabel': '标题',
    'prompts.description': '描述',
    'prompts.descriptionPlaceholder': '描述（可选）',
    'prompts.template': '模板',
    'prompts.templatePlaceholder': '输入 Prompt 模板，使用 {{变量名}} 语法...',
    'prompts.category': '分类',
    'prompts.tags': '标签',
    'prompts.tagsPlaceholder': '标签（逗号分隔）',
    'prompts.save': '保存',
    'prompts.update': '更新',
    'prompts.cancel': '取消',
    'prompts.delete': '删除',
    'prompts.variables': '变量填入',
    'prompts.playground': '测试 Playground',
    'prompts.preview': '渲染预览',
    'prompts.run': '运行',
    'prompts.running': '运行中...',
    'prompts.noTemplate': '选择一个模板开始测试',
    'prompts.missingVars': '请填写所有变量',
    'prompts.testRecords': '测试记录',
    'prompts.noRecords': '暂无测试记录',
    'prompts.retry': '重试',
    'prompts.filterAll': '全部分类',
    'prompts.varPlaceholder': '输入 {{var}} 的值...',

    // Vault
    'vault.title': 'Code Vault',
    'vault.search': '搜索片段...',
    'vault.allLangs': '全部语言',
    'vault.new': '+ 新建',
    'vault.newSnippet': '新建片段',
    'vault.editSnippet': '编辑片段',
    'vault.titleLabel': '标题',
    'vault.language': '语言',
    'vault.code': '代码',
    'vault.codePlaceholder': '粘贴代码...',
    'vault.tags': '标签（逗号分隔）',
    'vault.save': '保存',
    'vault.update': '更新',
    'vault.delete': '删除',
    'vault.edit': '编辑',
    'vault.cancel': '取消',
    'vault.noSnippets': '暂无片段，创建一个吧！',
    'vault.selectHint': '选择一个片段或创建新的',
    'vault.aiExplain': 'AI 解释',
    'vault.explainGenerate': '生成 AI 解释 →',
    'vault.explaining': '正在生成解释...',
    'vault.explanation': 'AI 解释',
    'vault.guideTitle': '💡 Code Vault 使用指南',
    'vault.guideStep1Title': '① 创建代码片段',
    'vault.guideStep1Desc': '点击「+ 新建」保存常用代码片段。填写标题、语言和标签方便后续检索——每个片段自动按语言归类。',
    'vault.guideStep2Title': '② AI 智能解释',
    'vault.guideStep2Desc': '选中片段后点击「生成 AI 解释」，DeepSeek 会分析代码逻辑、关键函数和潜在问题。解释会自动保存。',
    'vault.guideStep3Title': '③ 搜索与复用',
    'vault.guideStep3Desc': '支持关键词搜索和语言筛选。找到需要的片段后一键复制代码，提升开发效率。',
    'vault.guideExamples': '📋 示例片段',
    'vault.searchSemantic': 'AI 语义搜索...',
    'vault.semanticMode': '🧠 AI 语义搜索已启用 — 输入自然语言描述来查找代码',
    'vault.keywordMode': '🔤 关键字搜索模式（点击切换 AI 语义搜索）',
    'vault.searchKeyword': '关键字',
    'vault.searchAI': 'AI',
    'vault.backfillEmbeddings': '补全向量索引',
    'vault.backfillDone': '补全完成：{processed} 成功，{failed} 失败',
    'vault.backfillProcessing': '正在生成向量索引...',

    // Blog
    'blog.title': '博客',
    'blog.new': '+ 写文章',
    'blog.posts': '文章列表',
    'blog.devlog': '开发日志',
    'blog.noPosts': '暂无文章',
    'blog.noDevlog': '暂无开发日志',
    'blog.readMore': '阅读更多',
    'blog.edit': '编辑',
    'blog.delete': '删除',
    'blog.save': '发布',
    'blog.update': '更新',
    'blog.titleLabel': '标题',
    'blog.slug': 'Slug',
    'blog.content': '内容（Markdown）',
    'blog.tags': '标签（逗号分隔）',
    'blog.back': '← 返回',
    'blog.newPost': '写新文章',
  },

  en: {
    // Nav
    'nav.home': 'Home',
    'nav.chat': 'AI Chat',
    'nav.prompts': 'Prompt Studio',
    'nav.vault': 'Code Vault',
    'nav.blog': 'Blog',
    'nav.showcase': 'Showcase',

    // Home
    'home.title': 'Vibe Station',
    'home.subtitle': 'Personal AI Developer Workspace — AI-driven development toolchain',
    'home.chat.desc': 'Dual-model chat · Message-level switching',
    'home.prompts.desc': 'Templates · Variable validation · Run tracking',
    'home.vault.desc': 'Code snippets · AI explanation',
    'home.blog.desc': 'Vibe Coding devlog',
    'home.showcase.desc': 'EdgeGallery on-device AI',
    'home.newPost': '+ New Post',
    'home.repos': 'Repos',
    'home.stars': 'Stars',
    'home.followers': 'Followers',
    'home.following': 'Following',
    'home.recentRepos': 'Recent Repos',
    'home.statsUnavailable': 'GitHub stats unavailable right now.',
    'home.langLabel': 'Language',

    // Chat
    'chat.title': 'AI Chat',
    'chat.newSession': '+ New Chat',
    'chat.sessions': 'Sessions',
    'chat.cloud': 'Cloud',
    'chat.local': 'Local',
    'chat.typePlaceholder': 'Type a message...',
    'chat.send': 'Send',
    'chat.downloadModel': 'Download Model',
    'chat.modelDownloading': 'Downloading model...',
    'chat.localNotReady': 'Local model not ready. Please download first.',
    'chat.switchCloud': 'Switch to Cloud',
    'chat.switchLocal': 'Switch to Local',
    'chat.deleteSession': 'Delete',

    // Prompts
    'prompts.title': 'Prompt Studio',
    'prompts.templates': 'Templates',
    'prompts.new': '+ New Template',
    'prompts.edit': 'Edit Template',
    'prompts.titleLabel': 'Title',
    'prompts.description': 'Description',
    'prompts.descriptionPlaceholder': 'Description (optional)',
    'prompts.template': 'Template',
    'prompts.templatePlaceholder': 'Enter prompt template, use {{variable}} syntax...',
    'prompts.category': 'Category',
    'prompts.tags': 'Tags',
    'prompts.tagsPlaceholder': 'Tags (comma separated)',
    'prompts.save': 'Save',
    'prompts.update': 'Update',
    'prompts.cancel': 'Cancel',
    'prompts.delete': 'Delete',
    'prompts.variables': 'Variables',
    'prompts.playground': 'Playground',
    'prompts.preview': 'Preview',
    'prompts.run': 'Run',
    'prompts.running': 'Running...',
    'prompts.noTemplate': 'Select a template to start',
    'prompts.missingVars': 'Please fill in all variables',
    'prompts.testRecords': 'Test Records',
    'prompts.noRecords': 'No test records yet',
    'prompts.retry': 'Retry',
    'prompts.filterAll': 'All Categories',
    'prompts.varPlaceholder': 'Enter value for {{var}}...',

    // Vault
    'vault.title': 'Code Vault',
    'vault.search': 'Search snippets...',
    'vault.allLangs': 'All Languages',
    'vault.new': '+ New',
    'vault.newSnippet': 'New Snippet',
    'vault.editSnippet': 'Edit Snippet',
    'vault.titleLabel': 'Title',
    'vault.language': 'Language',
    'vault.code': 'Code',
    'vault.codePlaceholder': 'Paste your code...',
    'vault.tags': 'Tags (comma separated)',
    'vault.save': 'Save',
    'vault.update': 'Update',
    'vault.delete': 'Delete',
    'vault.edit': 'Edit',
    'vault.cancel': 'Cancel',
    'vault.noSnippets': 'No snippets yet. Create one!',
    'vault.selectHint': 'Select a snippet or create a new one',
    'vault.aiExplain': 'AI Explanation',
    'vault.explainGenerate': 'Generate AI Explanation →',
    'vault.explaining': 'Generating explanation...',
    'vault.explanation': 'AI Explanation',
    'vault.guideTitle': '💡 Code Vault Guide',
    'vault.guideStep1Title': '① Create Snippets',
    'vault.guideStep1Desc': 'Click "+ New" to save useful code snippets. Add a title, language, and tags for easy retrieval — snippets are auto-grouped by language.',
    'vault.guideStep2Title': '② AI Explanation',
    'vault.guideStep2Desc': 'Select a snippet and click "Generate AI Explanation". DeepSeek analyzes the code logic, key functions, and potential issues. The explanation is saved automatically.',
    'vault.guideStep3Title': '③ Search & Reuse',
    'vault.guideStep3Desc': 'Search by keyword or filter by language. Copy code with one click when you find what you need.',
    'vault.guideExamples': '📋 Example Snippets',
    'vault.searchSemantic': 'AI semantic search...',
    'vault.semanticMode': '🧠 AI semantic search active — describe what you need in natural language',
    'vault.keywordMode': '🔤 Keyword search mode (click to switch to AI semantic)',
    'vault.searchKeyword': 'Keyword',
    'vault.searchAI': 'AI',
    'vault.backfillEmbeddings': 'Rebuild vector index',
    'vault.backfillDone': 'Done: {processed} succeeded, {failed} failed',
    'vault.backfillProcessing': 'Building vector index...',

    // Blog
    'blog.title': 'Blog',
    'blog.new': '+ New Post',
    'blog.posts': 'Posts',
    'blog.devlog': 'Devlog',
    'blog.noPosts': 'No posts yet',
    'blog.noDevlog': 'No devlog entries yet',
    'blog.readMore': 'Read more',
    'blog.edit': 'Edit',
    'blog.delete': 'Delete',
    'blog.save': 'Publish',
    'blog.update': 'Update',
    'blog.titleLabel': 'Title',
    'blog.slug': 'Slug',
    'blog.content': 'Content (Markdown)',
    'blog.tags': 'Tags (comma separated)',
    'blog.back': '← Back',
    'blog.newPost': 'New Post',
  },
};

// ── Global locale state ──────────────────────────────────────
const currentLocale = ref<Locale>('zh');

export function useI18n() {
  // Init from localStorage (client only)
  if (import.meta.client && !currentLocale.value) {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved === 'zh' || saved === 'en') {
      currentLocale.value = saved;
    }
  }

  function t(key: string): string {
    return messages[currentLocale.value]?.[key] ?? messages.en[key] ?? key;
  }

  function setLocale(locale: Locale) {
    currentLocale.value = locale;
    if (import.meta.client) {
      localStorage.setItem(LOCALE_KEY, locale);
    }
  }

  function toggleLocale() {
    setLocale(currentLocale.value === 'zh' ? 'en' : 'zh');
  }

  const locale = computed(() => currentLocale.value);

  return { t, locale, setLocale, toggleLocale };
}
