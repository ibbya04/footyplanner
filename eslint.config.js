import footyplanner from '@footyplanner/eslint-plugin';
import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: [
            '**/node_modules/',
            '**/.wrangler/',
            '**/dist/',
            '**/worker-configuration.d.ts',
            'apps/web/legacy/',
            'apps/web/test-results/',
            'apps/web/playwright-report/',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    { files: ['apps/web/src/**/*.{ts,tsx}'], ...reactHooks.configs.flat['recommended-latest'] },
    { plugins: { footyplanner }, rules: { 'footyplanner/no-comments': 'error' } },
);
