import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // The legacy page and the Python script move or go away in later steps; they aren't linted.
    {
        ignores: [
            '**/node_modules/',
            '**/.wrangler/',
            '**/dist/',
            '**/worker-configuration.d.ts',
            'apps/web/legacy/',
            'scripts/',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
);
