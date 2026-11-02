import { createRequire } from 'node:module'
import pino from 'pino'

const require = createRequire(import.meta.url)

function developmentTransport(): pino.TransportSingleOptions | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined
  try {
    require.resolve('pino-pretty')
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
