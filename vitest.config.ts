import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // The app guards server-only modules with the 'server-only' import;
      // under Vitest (plain Node conditions) resolve it to a no-op module
      // instead of the client-error entry.
      'server-only': path.resolve(__dirname, 'src/test/server-only-stub.ts'),
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
});
