import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettierConfig from 'eslint-config-prettier';

/**
 * Test-file relaxations.
 *
 * Append this AFTER the base/react/worker layers so it wins. Each rule here is
 * off because the pattern it flags is idiomatic in tests, not debt — measured
 * against the repo on 2026-08-05, where 79% of no-non-null-assertion and 77% of
 * no-empty-function findings were in test files.
 *
 * Rules deliberately NOT relaxed: no-floating-promises and no-misused-promises
 * (an unawaited promise in a test is a silently passing test),
 * no-unnecessary-condition (it found real dead assertions), and no-unused-vars.
 */

const TEST_FILES = [
  '**/*.{test,spec}.{js,jsx,mjs,cjs,ts,tsx}',
  '**/tests/**/*.{js,jsx,mjs,cjs,ts,tsx}',
  '**/test/**/*.{js,jsx,mjs,cjs,ts,tsx}',
  '**/__tests__/**/*.{js,jsx,mjs,cjs,ts,tsx}',
  '**/__mocks__/**/*.{js,jsx,mjs,cjs,ts,tsx}',
  '**/test-stubs/**/*.{js,jsx,mjs,cjs,ts,tsx}',
  '**/*.setup.{js,mjs,cjs,ts}',
];

export default tseslint.config(
  // @pantheon-systems/eslint-config/base
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx', '**/*.mjs'],
    plugins: { import: importPlugin },
    // Packages alias their own source as @/… in tsconfig paths. Without this the
    // import plugin reads those as third-party and sorts them after relative ones.
    settings: { 'import/internal-regex': '^@/' },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2022,
      },
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-var-requires': 'warn',
      '@typescript-eslint/consistent-type-imports': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Import rules
      'import/extensions': 'off',
      'import/prefer-default-export': 'off',
      'import/no-unresolved': 'off',
      // 'internal' is absent from the rule's default group list, so aliased
      // imports would otherwise rank below every relative import.
      'import/order': [
        'warn',
        { groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'] },
      ],
      'import/no-extraneous-dependencies': 'warn',

      // General ESLint rules
      'no-console': 'off',
      'no-debugger': 'error',
      'lines-between-class-members': 'off',
      camelcase: 'off',
      'no-undef': 'off',
      'no-underscore-dangle': 'off',
      'no-unused-vars': 'off',
      'no-use-before-define': 'off',
      'no-redeclare': 'off',
      'no-restricted-syntax': 'off',
      'no-shadow': 'off',
      'no-else-return': 'off',
      'operator-linebreak': 'off',
      'no-plusplus': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/entrypoint',
              message:
                'Do not import from the entrypoint within source files. Import directly from the module instead.',
            },
          ],
        },
      ],

      // Stricter rules (warn to resolve over time)
      '@typescript-eslint/consistent-generic-constructors': 'warn',
      '@typescript-eslint/consistent-indexed-object-style': 'warn',
      '@typescript-eslint/no-shadow': 'warn',
      '@typescript-eslint/no-require-imports': 'warn',
      'no-async-promise-executor': 'warn',
      // Off deliberately. The rule's `interface` default is unsafe: interfaces have
      // no implicit index signature, so autofixing `type X = {...}` to an interface
      // silently breaks assignability to Record<string, unknown>. Both spellings are
      // fine; this is not worth a footgun.
      '@typescript-eslint/consistent-type-definitions': 'off',
      'no-useless-escape': 'warn',
      'no-useless-catch': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'prefer-const': 'warn',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-non-null-asserted-optional-chain': 'warn',
      // A no-op default for an optional callback is idiomatic here
      // (`onLogout ?? (() => {})`), and the rule cannot tell it from an
      // accidentally empty body. Still catches empty function declarations.
      '@typescript-eslint/no-empty-function': ['warn', { allow: ['arrowFunctions', 'methods'] }],
      '@typescript-eslint/no-empty-object-type': 'warn',
      '@typescript-eslint/no-wrapper-object-types': 'warn',
      'no-constant-binary-expression': 'warn',
      '@typescript-eslint/array-type': 'warn',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/no-redeclare': 'warn',
      'no-case-declarations': 'warn',
      'no-empty': 'warn',
      // Off: `delete record[computedKey]` is the normal way to drop a cache
      // entry or a patch path segment. The rule's alternative is switching the
      // structure to a Map, which is a design change, not a lint fix.
      '@typescript-eslint/no-dynamic-delete': 'off',
      'no-constant-condition': 'warn',
      'no-empty-pattern': 'warn',
      'no-var': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-extraneous-class': 'warn',
      '@typescript-eslint/unified-signatures': 'warn',
      // Off: `request<void>(...)` for an endpoint that returns no body is the
      // normal spelling in css-client, and that is a generic type argument —
      // which the rule's own message calls valid.
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-this-alias': 'warn',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    languageOptions: {
      globals: {
        jest: true,
      },
    },
  },
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/*.d.ts',
      '**/generated/**',
      // Vendored snapshots and test data. Linting these rewrites them, which
      // silently breaks any test asserting byte-identical output against them.
      '**/fixtures/**',
      '**/.puppeteerrc.cjs',
    ],
  },
  // @pantheon-systems/eslint-config/react
  {
    files: ['**/*.{ts,tsx,jsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/display-name': 'off',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  // @pantheon-systems/eslint-config/prettier
  prettierConfig,
  // @pantheon-systems/eslint-config/tests
  {
    files: TEST_FILES,
    rules: {
      // `x!` after a known-good arrange step asserts the fixture, it doesn't hide a bug.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // `() => {}` is the entire point of a stub.
      '@typescript-eslint/no-empty-function': 'off',
      // Passing an unbound method to vi.spyOn / expect is the documented API.
      '@typescript-eslint/unbound-method': 'off',
      // Test helpers are read at the call site; annotating their returns is noise.
      '@typescript-eslint/explicit-function-return-type': 'off',
      // `async` with no await is how you satisfy an interface in a fake.
      '@typescript-eslint/require-await': 'off',
      // Mock payloads are structurally untyped by nature.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-useless-constructor': 'off',
      // Stand-ins for `cloudflare:*` built-ins have to be classes to stand in
      // for classes, even with nothing in them.
      '@typescript-eslint/no-extraneous-class': 'off',
      // `vi.importActual<typeof import('mod')>('mod')` is vitest's documented
      // shape and cannot be hoisted to a top-level type import.
      '@typescript-eslint/consistent-type-imports': ['warn', { disallowTypeAnnotations: false }],
      // Inline fixtures and assertion chains run long. The formatter will own
      // line length once it lands; until then this is the only rule that would
      // force hand-wrapping code a formatter is about to rewrite.
      'max-len': 'off',
    },
  },
);
