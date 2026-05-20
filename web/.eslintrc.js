module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: './tsconfig.json',
    sourceType: 'module'
  },
  plugins: ['@typescript-eslint', 'react', "sort-imports-es6-autofix"],
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    "prettier",
    "plugin:prettier/recommended"
  ],
  settings: {
    "react": {
      version: "detect",
      runtime: "automatic"
    }
  },
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/camelcase': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/member-delimiter-style': [
      'error',
      {
        multiline: {
          delimiter: 'none'
        },
        singleline: {
          delimiter: 'semi',
          requireLast: false
        }
      }
    ],
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_'
      }
    ],
    '@typescript-eslint/no-use-before-define': 'off',
    '@typescript-eslint/no-var-requires': 'off',
    quotes: 'off',
    '@typescript-eslint/quotes': ['error', 'single'],
    '@typescript-eslint/semi': ['error', 'never'],
    "sort-imports-es6-autofix/sort-imports-es6": [2, {
      "ignoreCase": false,
      "ignoreMemberSort": false,
      "memberSyntaxSortOrder": ["none", "all", "multiple", "single"]
    }],
    // Feature boundary: features must not reach into other features' internals.
    // They can only import from another feature's public barrel (index.ts).
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@/features/*/components/*', '@/features/*/api/*', '@/features/*/slice'],
          message: 'Import from a feature\'s public barrel (e.g. @/features/datasets) instead of its internals.'
        }
      ]
    }]
  },
  'overrides': [
    {
      'files': './src/i18n/resources.ts',
      'rules': {
        '@typescript-eslint/quotes': 'off'
      }
    },
    {
      // Allow features to import their own internals; restriction is for cross-feature imports.
      'files': './src/features/**/*',
      'rules': {
        'no-restricted-imports': 'off'
      }
    },
    {
      // App and shared/Sidenav need to lazy-load feature pages and entry points
      'files': ['./src/app/**/*', './src/shared/**/*', './src/store/**/*'],
      'rules': {
        'no-restricted-imports': 'off'
      }
    }
  ]
}
