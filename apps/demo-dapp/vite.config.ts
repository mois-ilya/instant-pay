import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import tailwindcss from '@tailwindcss/postcss';

export default defineConfig({
  plugins: [solid()],
  css: {
    postcss: {
      plugins: [tailwindcss()],
    },
  },
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
  },
});