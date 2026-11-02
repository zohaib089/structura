import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { constants as fsConstants } from 'node:fs'
import { redactSecrets } from '@atlasmith/source-ingest'
import type { RunCommandFn } from './types.js'

const SAFE_ENV_KEYS = new Set([
  'PATH',
  'HOME',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'SYSTEMROOT',
  'TEMP',
  'TMP',
  'TMPDIR',
  'USERPROFILE',
  'APPDATA',
  'ComSpec'
])

const SECRET_ENV_PATTERN = /(TOKEN|SECRET|PASSWORD|API_KEY|CREDENTIAL|PRIVATE_KEY|AUTH)/i

export function minimalProcessEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    NO_COLOR: '1',
    CI: 'true',
    npm_config_yes: 'true'
  }
  for (const key of SAFE_ENV_KEYS) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  env.GIT_TERMINAL_PROMPT = '0'
  return env
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function which(command: string, env: NodeJS.ProcessEnv): Promise<string | null> {
  const pathValue = env.PATH ?? process.env.PATH ?? ''
  for (const dir of pathValue.split(':')) {
    if (!dir) continue
    const candidate = `${dir}/${command}`
    if (await pathExists(candidate)) return candidate
  }
  if (SECRET_ENV_PATTERN.test(command)) return null
  return null
}

export const defaultRunCommand: RunCommandFn = (command, args, options) =>
  new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe']
    })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    let stdoutBytes = 0
    let stderrBytes = 0

    const append = (target: 'stdout' | 'stderr', chunk: Buffer) => {
      const text = chunk.toString('utf8')
      const len = Buffer.byteLength(text)
      if (target === 'stdout') {
        stdoutBytes += len
        if (stdoutBytes <= options.maxOutputBytes) stdout += text
      } else {
        stderrBytes += len
        if (stderrBytes <= options.maxOutputBytes) stderr += text
      }
    }

    child.stdout?.on('data', chunk => append('stdout', Buffer.from(chunk)))
    child.stderr?.on('data', chunk => append('stderr', Buffer.from(chunk)))

    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, options.timeoutMs)

    child.on('error', error => {
      clearTimeout(timer)
      resolve({
        stdout: redactSecrets(stdout),
        stderr: redactSecrets(stderr),
        code: null,
        timedOut: false,
        spawnError: error.message
      })
    })

    child.on('close', code => {
      clearTimeout(timer)
      resolve({
        stdout: redactSecrets(stdout),
        stderr: redactSecrets(stderr),
        code,
        timedOut
      })
    })
  })
