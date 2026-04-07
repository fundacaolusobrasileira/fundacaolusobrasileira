import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 5173,
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
      }
    };
});
