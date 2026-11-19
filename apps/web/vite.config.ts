import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const api = 'http://localhost:8787';

export default defineConfig({
    base: '/next/',
    plugins: [react()],
    build: { outDir: 'dist/next', emptyOutDir: true },
    server: { proxy: { '/api': api, '/img': api } },
});
