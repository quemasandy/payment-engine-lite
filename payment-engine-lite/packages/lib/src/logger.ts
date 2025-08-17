import pino from 'pino'
import { LoggerPort } from '@ports/core'

const redact = {
  paths: ['token', 'data.token', 'authorization', 'headers.authorization'],
  censor: '[REDACTED]'
}

const base = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact
})

export const logger: LoggerPort = {
  info: (o, msg) => base.info(o, msg),
  warn: (o, msg) => base.warn(o, msg),
  error: (o, msg) => base.error(o, msg),
  child: (meta) => {
    const child = base.child(meta)
    return {
      info: (o, msg) => child.info(o, msg),
      warn: (o, msg) => child.warn(o, msg),
      error: (o, msg) => child.error(o, msg),
      child: (m) => {
        const c2 = child.child(m)
        return {
          info: (o, msg) => c2.info(o, msg),
          warn: (o, msg) => c2.warn(o, msg),
          error: (o, msg) => c2.error(o, msg),
          child: () => logger
        }
      }
    }
  }
}
