import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import globals from 'globals';

// NOTE: This project's TypeScript devDependency is 7.0.2, which
// typescript-eslint does not support yet (it hard-refuses to load - see
// https://github.com/typescript-eslint/typescript-eslint/issues/10940).
// Until that lands, .ts files and App.vue's <script lang="ts"> block are
// excluded below rather than left unlinted-and-silently-broken. Re-add
// typescript-eslint (it was briefly wired up and removed for this reason)
// once it supports TS 7.

export default [
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/vendor/**',
      'data/**',
      'temp/**',
      'tmp/**',
      'coverage/**',
      '**/*.ts', // see NOTE above - no TS-aware parser available yet
      'src/App.vue', // only .vue file using <script lang="ts">
    ],
  },
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Security: v-html bypasses Vue's auto-escaping and is the primary
      // XSS vector. Keep this an error even if it's already covered by the
      // recommended preset - it must never get silently downgraded.
      'vue/no-v-html': 'error',

      // This is a gradual-adoption codebase (mid-migration from AngularJS,
      // mixed .js/.vue files) - relax rules that would otherwise flag a huge
      // volume of pre-existing, working code rather than real bugs.
      'vue/multi-word-component-names': 'off',
      // ignoreRestSiblings: don't flag vars only used to omit a key via
      // rest-destructuring, e.g. `({ _priority, ...rest }) => rest`.
      'no-unused-vars': ['warn', { ignoreRestSiblings: true }],
      // filters/combatant are shared reactive() objects intentionally passed
      // as props and mutated in place (not copy-in/event-out) - a deliberate
      // architectural choice here, not the anti-pattern this rule targets.
      'vue/no-mutating-props': 'warn',
    },
  },
];
