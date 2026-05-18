// @ts-check
import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        ignores: ['node_modules/**', 'dist/**', 'coverage/**'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                // Node.js process/env built-ins not in ecmaVersion set
                process: 'readonly',
                console: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                // Timer globals (Node.js variants not always in recommended)
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                // Node 18+ Web-compatible built-ins
                fetch: 'readonly',
                AbortController: 'readonly',
                AbortSignal: 'readonly',
                FormData: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                structuredClone: 'readonly',
            },
        },
        rules: {
            // Disable redeclare — our globals above may overlap with ecmaVersion built-ins
            // (setInterval, AbortSignal etc. are in both our list and ES2022 spec)
            'no-redeclare': 'off',

            // Error prevention
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-console': ['warn', { allow: ['warn', 'error'] }],       // Prefer logger
            'consistent-return': 'warn',
            'no-unreachable': 'error',
            'no-duplicate-imports': 'error',

            // Async safety
            'no-async-promise-executor': 'error',
            'require-await': 'warn',

            // Code style
            'prefer-const': 'warn',
            'no-var': 'error',
            'eqeqeq': ['error', 'always', { null: 'ignore' }],
            'curly': ['warn', 'all'],
        },
    },
    // ── Test files: declare Jest globals to eliminate no-undef errors ────────
    {
        files: ['**/__tests__/**/*.js', '**/*.test.js'],
        languageOptions: {
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                jest: 'readonly',
            },
        },
        rules: {
            'no-console': 'off',           // test helpers may use console
            'require-await': 'off',        // jest describe/it are not async
        },
    },
];
