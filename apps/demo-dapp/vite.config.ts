import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  base: '/instant-pay/',
  plugins: [
    solid(),
  ],
  optimizeDeps: {
    include: ['@codemirror/state', '@codemirror/view'],
  },
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    host: true,
    port: 5173,
    open: true,
  },
  build: {
    target: 'esnext',
  },
});
