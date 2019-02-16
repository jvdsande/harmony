import Cluster from 'cluster'

import Winston from 'winston'
import moment from 'moment'
import colors from 'colors/safe'

import { LoggerClass, LogConfig, LogLevel } from '@foundationjs/typedefs/logger'

export default class Logger implements LoggerClass {
  logger: any

  fileLogger: any

  constructor(name: string, config?: LogConfig) {
    const {
      disabled, level, filename, console,
    } = config || {
      disabled: false,
      level: 'info',
      filename: null,
      console: false,
    }

    const test = 'test'

    const type = {
      error: colors.red('ERROR  '),
      warn: colors.yellow('WARNING'),
      info: colors.yellow('INFO   '),
      verbose: colors.green('VERBOSE'),
      debug: colors.green('DEBUG  '),
      silly: colors.magenta('SILLY  '),
    }

    const fileType = {
      error: 'ERROR  ',
      warn: 'WARNING',
      info: 'INFO   ',
      verbose: 'VERBOSE',
      debug: 'DEBUG  ',
      silly: 'SILLY  ',
    }

    const NAME_LENGTH = 16

    const cut = name.slice(0, NAME_LENGTH)
    const frontSpaces = NAME_LENGTH - cut.length
    const padded = Array(frontSpaces + 1)
      .join(' ')

    const timeFormat = 'YY/MM/DD HH:mm:ss.SSS'

    const suffix = Cluster.isMaster ? '' : `[Instance ${Cluster.worker.id}]`

    const logFormat = Winston.format.printf(
      i => (
        `${suffix}${
          colors.grey(`${moment(i.timestamp).format(timeFormat)}`)
          + colors.bold(colors.grey(` ${cut} ${padded} [`))
          + colors.bold(type[i.level])
          + colors.bold(colors.grey(']'))
        } ${i.message}`
      ),
    )

    const fileFormat = Winston.format.printf(
      i => (
        `${moment(i.timestamp)
          .format(timeFormat)} ${cut} ${padded} [${fileType[i.level]}] ${i.message}`
      ),
    )

    if (console || (process.env.NODE_ENV !== 'production')) {
      this.logger = Winston.createLogger({
        silent: disabled,
        level: level || 'info',
        transports: [new Winston.transports.Console()],
        format: Winston.format.combine(
          Winston.format.timestamp(),
          logFormat,
        ),
      })
    }

    if (filename || process.env.NODE_ENV === 'production') {
      this.fileLogger = Winston.createLogger({
        silent: disabled,
        level: level || 'info',
        transports: [new Winston.transports.File({
          filename: filename ? (suffix + filename) : `${suffix}foundation-framework.log`,
        })],
        format: Winston.format.combine(
          Winston.format.timestamp(),
          fileFormat,
        ),
      })
    }
  }

  set level(level: LogLevel) {
    if (this.logger) {
      this.logger.level = level
    }
  }

  set fileLevel(level: LogLevel) {
    if (this.fileLogger) {
      this.fileLogger.level = level
    }
  }

  error = (...args: any) => {
    if (this.logger) {
      this.logger.error(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.error(...args)
    }
  }

  warn = (...args: any) => {
    if (this.logger) {
      this.logger.warn(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.warn(...args)
    }
  }

  info = (...args: any) => {
    if (this.logger) {
      this.logger.info(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.info(...args)
    }
  }

  verbose = (...args: any) => {
    if (this.logger) {
      this.logger.verbose(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.verbose(...args)
    }
  }

  debug = (...args: any) => {
    if (this.logger) {
      this.logger.debug(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.debug(...args)
    }
  }

  silly = (...args: any) => {
    if (this.logger) {
      this.logger.silly(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.silly(...args)
    }
  }

  log = (...args: any) => {
    if (this.logger) {
      this.logger.warn('Avoid using the \'log\' command, prefer \'info\', \'debug\' or \'warn\'')
      this.logger.debug(...args)
    }
    if (this.fileLogger) {
      this.fileLogger.warn('Avoid using the \'log\' command, prefer \'info\', \'debug\' or \'warn\'')
      this.fileLogger.debug(...args)
    }
  }
}
