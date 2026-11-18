import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    // The legacy page is replaced in step 3; it isn't linted.
    {
        ignores: ['**/node_modules/', '**/.wrangler/', '**/dist/', '**/worker-configuration.d.ts', 'apps/web/legacy/'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
);
