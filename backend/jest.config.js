export default {
    coverageProvider: 'v8',
    // Run before any test modules are imported — sets minimum env vars so env.js
    // does not call process.exit(1) when imported transitively by test files.
    setupFiles: ['./jest.setup.env.js'],
    testEnvironment: 'node',
    testTimeout: 30000,
    testMatch: ['**/__tests__/**/*.test.js', '**/*.test.js'],
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/**/__tests__/**',
        '!src/scripts/**',
    ],
    coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
    coverageThreshold: {
        global: {
            branches: 50,
            functions: 60,
            lines: 60,
            statements: 60,
        },
    },
};

