import { RuleTester } from 'eslint';
import tseslint from 'typescript-eslint';
import { describe, it } from 'vitest';
import { noComments } from '../src/no-comments.js';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({
    languageOptions: {
        parser: tseslint.parser,
        parserOptions: { ecmaFeatures: { jsx: true } },
    },
});

ruleTester.run('no-comments', noComments, {
    valid: [
        'const url = "https://example.com/*";',
        'const a = 1;',
        '// eslint-disable-next-line no-console\nconsole.log(1);',
        '/* eslint-disable */\nconst a = 1;',
        'const a = 1; // eslint-disable-line no-unused-vars',
        '// @ts-expect-error wrong on purpose\nconst a: number = "x";',
        '/// <reference types="vite/client" />\nconst a = 1;',
        '#!/usr/bin/env node\nconst a = 1;',
    ],
    invalid: [
        { code: '// why\nconst a = 1;', errors: [{ messageId: 'comment' }] },
        { code: 'const a = 1; // why', errors: [{ messageId: 'comment' }] },
        { code: '/* why */ const a = 1;', errors: [{ messageId: 'comment' }] },
        { code: 'const el = <div>{/* why */}</div>;', errors: [{ messageId: 'comment' }] },
    ],
});
