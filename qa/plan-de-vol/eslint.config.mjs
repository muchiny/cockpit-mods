// Lint du mod plan-de-vol : règles typées strictes de typescript-eslint.
// Lancé depuis le dossier du mod avec `--config` (les motifs se lisent alors
// depuis ce dossier, les plugins se résolvent ici) : voir lint.sh.

import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

const MOD = new URL('../../plan-de-vol/', import.meta.url).pathname

export default defineConfig([
  { ignores: ['.claude-plugin/**'] },
  {
    files: ['hooks/**/*.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'types/**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: MOD,
      },
    },
    rules: {
      // L'idiome du moteur et du mod : des alias `type` (formes fermées, unions).
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // Un nombre dans un texte d'interface est l'usage, pas un oubli.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // Le moteur attend la promesse d'un hook passé à on(...) et celle d'un
      // onPress (ses propres exemples en renvoient une). La vérification des
      // arguments confronte en outre chaque hook aux centaines de surcharges
      // de on(...) : plus de 4 minutes sur register.tsx, contre 2 s sans.
      // Les autres cas (retours, propriétés, variables, spreads) restent vérifiés.
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { arguments: false, attributes: false } }],
    },
  },
])
