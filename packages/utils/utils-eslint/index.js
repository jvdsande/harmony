module.exports = {
  extends: 'airbnb',

  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    allowImportExportEverywhere: true,
  },

  globals: {
    window: true,
    document: true,
  },

  env: {
    browser: true,
    es6: true,
  },

  rules: {
    'camelcase': 'warn',
    'class-methods-use-this': 'off',
    'no-console': 'warn',
    'no-underscore-dangle': 'off',

    'max-len': [
      'error',
      120,
    ],
    'semi': [
      'error',
      'never',
    ],

    'prefer-destructuring': ['error', {
      VariableDeclarator: {
        array: false,
        object: true,
      },
      AssignmentExpression: {
        array: false,
        object: false,
      },
    }],

    'quotes': ['error', 'single'],
    'quote-props': ['error', 'consistent-as-needed'],

    'valid-jsdoc': ['error', {
      requireReturn: false,
      requireReturnType: true,
      requireParamDescription: true,
      requireReturnDescription: true,
    }],
    'require-jsdoc': ['warn', {
      require: {
        FunctionDeclaration: true,
        MethodDefinition: true,
        ClassDeclaration: true,
      },
    }],

    'compat/compat': 'off',

    'import/extensions': ['error', { ts: 'never' }],
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',
    'import/prefer-default-export': 'off',

    'react/forbid-prop-types': 'off',
    'react/no-multi-comp': 'off',
    'react/prefer-stateless-function': 'off',
    'react/jsx-one-expression-per-line': 'off',

    // Typescript
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error', {
      vars: 'all',
      args: 'after-used',
      ignoreRestSiblings: false,
    }],
  },

  plugins: [
    '@typescript-eslint',
    'compat',
    'import',
  ],

  settings: {
    polyfills: ['promises'],
  },
}
