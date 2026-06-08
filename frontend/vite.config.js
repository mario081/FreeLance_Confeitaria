import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // loadEnv com prefix '' carrega TODAS as vars — incluindo as sem prefixo VITE_
  // DEV_API_KEY nunca vai para o bundle do browser pois não tem prefixo VITE_
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      proxy: {
        '/api': {
          target: env.DEV_API_TARGET || 'http://localhost:3000',
          rewrite: (path) => path.replace(/^\/api/, ''),
          headers: { 'x-api-key': env.DEV_API_KEY || '' },
          changeOrigin: true,
        },
      },
    },
  };
});
