import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js', 'tests/api/**/*.test.js'],
    globalSetup: ['tests/setup/global-setup.js'],
    setupFiles: ['tests/setup/env.js', 'tests/setup/close-db.js'],
    // Test files share one database, so run them one after another.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
