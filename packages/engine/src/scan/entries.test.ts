import assert from 'node:assert/strict'
import test from 'node:test'
import { ENTRY_CONFIDENCE, findEntryCandidates } from './entries.js'

const files = new Set([
  'package.json',
  'pyproject.toml',
  'setup.cfg',
  'Dockerfile',
  'src/index.ts',
  'src/run.py',
  'pkg/cli.py'
])

const texts = new Map<string, string>([
  ['package.json', '{"name":"demo","exports":"./src/index.ts","main":"./src/index.ts","bin":{"cli":"./src/index.ts"},"scripts":{"start":"node ./src/run.py","dev":"tsx src/index.ts"}}'],
  ['pyproject.toml', '[project.scripts]\nserve = "pkg.cli:main"\n'],
  ['setup.cfg', '[options.entry_points]\nconsole_scripts =\n    demo = pkg.cli:main\n'],
  ['Dockerfile', 'FROM node:22\nCMD ["node", "src/index.ts"]\n'],
  ['src/index.ts', 'export {}\n'],
  ['src/run.py', 'if __name__ == "__main__":\n    pass\n'],
  ['pkg/cli.py', 'def main(): pass\n']
])

test('findEntryCandidates collects config, conventional and python guard evidence', () => {
  const result = findEntryCandidates(files, path => texts.get(path), path => {
    const raw = texts.get(path)
    return raw ? JSON.parse(raw) : undefined
  })
  const index = result.get('src/index.ts')
  assert.ok(index)
  assert.equal(index?.primary.reason, 'package-exports')
  assert.equal(index?.primary.provenance, 'EXTRACTED')
  assert.ok(index?.candidates.length >= 3)
  assert.equal(index?.candidates[0]?.reason, 'package-exports')
  assert.equal(index?.candidates[0]?.confidence, ENTRY_CONFIDENCE['package-exports'])
  assert.match(index?.candidates[0]?.evidence.pointer ?? '', /package\.json#\/exports/)

  const runPy = result.get('src/run.py')
  assert.ok(runPy?.candidates.some(item => item.reason === 'python-name-main' && item.evidence.span?.start.line === 1))

  const cliPy = result.get('pkg/cli.py')
  assert.ok(cliPy?.candidates.some(item => item.reason === 'pyproject-script'))
})

test('package scripts accept tsx and ts-node literals only', () => {
  const localFiles = new Set(['package.json', 'src/a.ts'])
  const localTexts = new Map([
    ['package.json', '{"scripts":{"a":"tsx src/a.ts","b":"ts-node src/a.ts","c":"npm start"}}'],
    ['src/a.ts', '']
  ])
  const result = findEntryCandidates(localFiles, path => localTexts.get(path), path => JSON.parse(localTexts.get('package.json') as string))
  const candidates = result.get('src/a.ts')?.candidates ?? []
  assert.equal(candidates.filter(item => item.reason === 'package-script').length, 2)
})
