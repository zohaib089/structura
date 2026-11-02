import { createRequire } from 'node:module'
import { join } from 'node:path'
import pino from 'pino'

const nodeRequire = createRequire(join(process.cwd(), 'package.json'))

function developmentTransport(): pino.TransportSingleOptions | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined
  try {
    nodeRequire.resolve('pino-pretty')
  } catch {
    return undefined
  }
  return {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  }
}

const transport = developmentTransport()

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  ...(transport ? { transport } : {})
})
