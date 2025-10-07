import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { cwd } from 'node:process';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, cwd(), '');
  return {
    // vite config
    plugins: [react()],
    // IMPORTANT: This now matches your repository name
    base: '/AI-Studio/',
    define: {
      // This makes the API_KEY from your .env file available in the app
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
  };
});