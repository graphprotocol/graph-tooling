module.exports = {
    env: {
        node: true,
        es2017: true,
        jest: true,
    },
    extends: 'eslint:recommended',
    parserOptions: {
        ecmaVersion: 12,
    },
    rules: {
        'no-empty': ['error', { 'allowEmptyCatch': true }],
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
    // TODO: remove this and fix the no-undef rule error
    ignorePatterns: ['examples/basic-event-handlers/migrations', 'examples/basic-event-handlers/test'],
}
