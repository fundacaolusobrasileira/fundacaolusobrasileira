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
          // 'v8' literal (nao 'string') — necessario para o tipo CoverageOptions.
          provider: 'v8' as const,
          include: ['services/**', 'validation/**', 'utils/**'],
          exclude: ['**/node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
          thresholds: {
            // Chaves de threshold por diretorio SAO globs. As chaves antigas
            // ('services/', 'validation/', 'utils/') nao casavam nenhum ficheiro,
            // portanto os limites nunca eram avaliados — configuracao morta.
            '**/services/**': { statements: 80, branches: 75 },
            '**/validation/**': { statements: 100 },
            '**/utils/**': { statements: 100 },
          },
          reporter: ['text', 'lcov', 'html'],
          reportsDirectory: './coverage',
          // Sem isto o relatorio NAO e' escrito quando ha testes a falhar
          // (era a causa de 'coverage/' nunca ser criado).
          reportOnFailure: true,
        },
      }
    };
});
