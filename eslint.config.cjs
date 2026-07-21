const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            parserOptions: {
                project: "./tsconfig.json",
                ecmaFeatures: {
                    jsx: true,
                },
            },
        },
        rules: {
            "no-else-return": "warn",
            "space-unary-ops": "error",
            "no-console": "error",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/prefer-for-of": "warn",
            "@typescript-eslint/ban-ts-ignore": "off",
            "@typescript-eslint/no-unused-vars": [
                "warn",
                { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
            ],
            "@typescript-eslint/no-unused-expressions": "warn",
        },
    },
    {
        ignores: [
            "eslint.config.cjs",
            "tailwind.config.js",
            "build",
            ".plasmo",
            "resources/",
            ".prettierrc.mjs",
            "postcss.config.js",
            "vitest.config.ts",
        ],
    },
);
