import { defineConfig } from 'vitest/config';
import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rls/**/*.spec.ts'],
    testTimeout: 15000,
    hookTimeout: 30000,
    sequence: { concurrent: false },
  },
});
