import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Run tests with client-side semantics so import.meta.client guards in
  // useLocalLLM behave the same as in the Nuxt browser build.
  define: {
    'import.meta.client': true,
    'import.meta.server': false,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'server/**/*.test.ts'],
  },
});
