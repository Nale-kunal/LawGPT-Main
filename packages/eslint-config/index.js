/**
 * @juriq/eslint-config
 *
 * Shared base ESLint configuration for the Juriq workspace.
 * Individual apps extend this with their own overrides.
 */

export default {
  rules: {
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'multi-line'],
  },
};
