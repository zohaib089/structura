import tseslint from 'typescript-eslint'

const banned = ['child_process', 'cluster', 'net', 'http', 'https', 'dns', 'tls', 'dgram']
const paths = banned.flatMap(name => [
  { name, message: 'The engine and CLI must not spawn processes or open network sockets.' },
  { name: `node:${name}`, message: 'The engine and CLI must not spawn processes or open network sockets.' }
])

export default [
  {
    files: ['packages/engine/src/**/*.ts', 'packages/cli/src/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { sourceType: 'module' }
    },
    rules: {
      'no-restricted-imports': ['error', { paths }]
    }
  }
]
