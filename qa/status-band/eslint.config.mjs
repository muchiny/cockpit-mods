// Lints the mod from its own folder: run with `-c` from there, so the
// patterns below and the project's tsconfig resolve against the mod, while
// the plugins resolve from the benches' node_modules, one level up.
import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['.claude-plugin/**'] },
  {
    files: ['hooks/**/*.{ts,tsx}', 'types/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        // The mod's tsconfig.json, which carries the engine's types.
        projectService: true,
        tsconfigRootDir: process.cwd(),
        ecmaFeatures: { jsx: true },
        // JSX compiles against the engine's global `h`.
        jsxPragma: 'h',
      },
    },
    rules: {
      // The mod and the engine's types write object types as `type`.
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // The strict preset's options, numbers let in: `${n} en vol` is plain.
      // Restated whole, as options left out fall back to permissive defaults.
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
      // Checking every argument against the engine's `on(...)`, one overload
      // per event, does not finish in minutes (typescript-eslint 8.72.1,
      // measured: over 60 s on register.tsx alone, 2 s without). The rest of
      // the rule stays on; timers are handed `() => void work()`.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false } }],
    },
  },
)
