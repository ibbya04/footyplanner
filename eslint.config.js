import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['**/node_modules/', '**/.wrangler/', '**/dist/', '**/worker-configuration.d.ts', 'apps/web/legacy/'],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
);
