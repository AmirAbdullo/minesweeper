/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    // The game logic is plain TypeScript, so tests run in Node without a DOM.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
