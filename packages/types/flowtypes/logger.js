// @flow

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'

export type LogConfig = {
  disabled?: boolean,
  level?: LogLevel,
  filename?: string,
  console?: boolean,
}

export interface LoggerClass {
  fileLogger: Object,
  logger: Object,

  error: (any) => void,
  warn: (any) => void,
  info: (any) => void,
  verbose: (any) => void,
  debug: (any) => void,
  silly: (any) => void,
  log: (any) => void,
}
