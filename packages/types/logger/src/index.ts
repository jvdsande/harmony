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

  error: (...args: any[]) => void,
  warn: (...args: any[]) => void,
  info: (...args: any[]) => void,
  verbose: (...args: any[]) => void,
  debug: (...args: any[]) => void,
  silly: (...args: any[]) => void,
  log: (...args: any[]) => void,
}
