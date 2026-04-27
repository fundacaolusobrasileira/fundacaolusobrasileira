import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: parseInt(process.env.PORT ?? '5173'),
        host: 'localhost',
      },
      plugins: [react()],
      css: {
        postcss: './postcss.config.ts',
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
              'vendor-supabase': ['@supabase/supabase-js'],
            },
          },
        },
      },
      test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        exclude: ['**/node_modules/**', 'tests/rls/**', 'tests/e2e/**'],
        coverage: {
          provider: 'v8',
          include: ['services/**', 'validation/**', 'utils/**'],
          exclude: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
          thresholds: {
            'services/': { statements: 80, branches: 75 },
            'validation/': { statements: 100 },
            'utils/': { statements: 100 },
          },
          reporter: ['text', 'lcov'],
        },
      }
    };
});
