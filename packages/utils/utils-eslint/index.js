module.exports = {
  extends: [
    'airbnb',
  ],

  globals: {
    'window': true,
    'document': true,
    'React': true,
    'React.Fragment': true,
    'PropTypes': true,
    'RouterPropTypes': true,
  },

  env: {
    browser: true,
    es6: true,
  },

  rules: {
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

    'compat/compat': 'error',

    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'error',

    'react/forbid-prop-types': 'off',
    'react/no-multi-comp': 'off',
    'react/prefer-stateless-function': 'off',
    'react/jsx-one-expression-per-line': 'off',
  },

  plugins: [
    'compat',
    'import',
  ],

  settings: {
    polyfills: ['promises'],
  },
}
