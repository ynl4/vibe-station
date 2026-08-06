import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  template: text('template').notNull(),
  category: text('category').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  useCount: integer('use_count').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const promptRuns = sqliteTable('prompt_runs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  promptId: integer('prompt_id').references(() => prompts.id).notNull(),
  variables: text('variables', { mode: 'json' }).$type<Record<string, string>>().notNull(),
  model: text('model').notNull(),
  provider: text('provider').notNull(),
  output: text('output').notNull(),
  outputTokenCount: integer('output_token_count'),
  outputTruncated: integer('output_truncated').notNull().default(0),
  latencyMs: integer('latency_ms'),
  status: text('status').notNull().default('success'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
