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
    },
}
