import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const api = 'http://localhost:8787';

export default defineConfig({
    plugins: [react()],
    build: { outDir: 'dist', emptyOutDir: true },
    server: { proxy: { '/api': api, '/img': api } },
    test: { include: ['src/**/*.test.ts'] },
});
