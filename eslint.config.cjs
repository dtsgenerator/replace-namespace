module.exports = [
    ...require('@dtsgenerator/eslint-config'),
    {
        files: ['index.ts'],
        rules: { '@typescript-eslint/no-require-imports': 'off' },
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
        },
    },
];
