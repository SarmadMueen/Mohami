module.exports = {
  env: {
    node: true,
    browser: true,
    es2021: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:react/recommended",
    "plugin:@next/next/recommended",
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: "module",
  },
  plugins: ["react"],
  
  rules: {
    "react/no-unknown-property": ["error", { ignore: ["jsx", "global"] }],
    'react/jsx-no-comment-textnodes': 'off',
    'react/prop-types': 'warn', // Allow PropTypes warnings instead of errors
    'no-unused-vars': 'warn', // Treat unused vars as warnings instead of errors
    'no-irregular-whitespace': ['error', { skipStrings: true, skipComments: true, skipRegExps: true, skipTemplates: true }], // Allow in strings/templates
    'no-undef': 'error', // Keep this as error
    'no-case-declarations': 'error', // Keep this as error
    'no-prototype-builtins': 'warn', // Treat as warning
    'no-fallthrough': 'error', // Keep this as error
    'no-useless-escape': 'warn', // Treat as warning
    'react/no-unescaped-entities': 'warn', // Treat as warning
    'react-hooks/exhaustive-deps': 'off', // Disable if rule not found
  },
  globals: {
    React: "writable",
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};