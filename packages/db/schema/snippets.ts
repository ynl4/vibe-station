import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const snippets = sqliteTable('snippets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description'),
  code: text('code').notNull(),
  language: text('language').notNull(),
  explanation: text('explanation'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().default([]),
  embedding: text('embedding'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
