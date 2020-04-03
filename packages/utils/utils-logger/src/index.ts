import * as Winston from 'winston'
import moment from 'moment'
import colors from 'colors/safe'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug' | 'verbose' | 'silly'

export type LoggerConfig = {
  disabled?: boolean,
  level?: LogLevel,
  filename?: string,
  console?: boolean | {
    colors?: boolean,
    timestamp?: boolean,
  },
}

export interface ILogger {
  configure(config: LoggerConfig): this

  error(message: string, ...meta: any[]): this
  warn(message: string, ...meta: any[]): this
  info(message: string, ...meta: any[]): this
  verbose(message: string, ...meta: any[]): this
  debug(message: string, ...meta: any[]): this
  silly(message: string, ...meta: any[]): this
  log(message: string, ...meta: any[]): this

  level: LogLevel
}

let NAME_LENGTH = 16

function Logger({ name, configuration } : { name: string, configuration: LoggerConfig }) : ILogger {
  const local = {
    logger: Winston.createLogger({ transports: [], silent: true }),
    fileLogger: Winston.createLogger({ transports: [], silent: true }),
  }

  const modes : LogLevel[] = ['error', 'warn', 'info', 'verbose', 'debug', 'silly']

  const instance : Partial<ILogger> = ({
    configure(config) {
      const {
        disabled = false, level = 'info', filename = undefined, console = (process.env.NODE_ENV !== 'production'),
      } = config

      NAME_LENGTH = Math.max(NAME_LENGTH, name.length)

      const timeFormat = 'YY/MM/DD HH:mm:ss.SSS'
      const useTimestamps = (console && ((typeof console === 'boolean') || console.timestamp !== false))
      const useColors = (console && ((typeof console === 'boolean') || console.colors !== false))

      const pass = (s: string) => s
      const grey = useColors ? colors.grey : pass
      const red = useColors ? colors.red : pass
      const yellow = useColors ? colors.yellow : pass
      const green = useColors ? colors.green : pass
      const magenta = useColors ? colors.magenta : pass
      const bold = useColors ? colors.bold : pass

      const type = {
        error: red('ERROR  '),
        warn: yellow('WARNING'),
        info: yellow('INFO   '),
        verbose: green('VERBOSE'),
        debug: green('DEBUG  '),
        silly: magenta('SILLY  '),
      }

      const fileType = {
        error: 'ERROR  ',
        warn: 'WARNING',
        info: 'INFO   ',
        verbose: 'VERBOSE',
        debug: 'DEBUG  ',
        silly: 'SILLY  ',
      }

      const logFormat = Winston.format.printf(
        (i) => {
          const cut = name.slice(0, NAME_LENGTH)
          const frontSpaces = NAME_LENGTH - cut.length
          const padded = Array(frontSpaces + 1)
            .join(' ')

          return (
            [
              useTimestamps ? `${grey(moment(i.timestamp).format(timeFormat))} ` : '',
              bold(grey(`${cut} ${padded}[`)),
              bold(type[i.level as LogLevel]),
              bold(grey(']')),
              ` ${i.message}`,
            ].join('')
          )
        },
      )

      const fileFormat = Winston.format.printf(
        (i) => {
          const cut = name.slice(0, NAME_LENGTH)
          const frontSpaces = NAME_LENGTH - cut.length
          const padded = Array(frontSpaces + 1)
            .join(' ')

          return (
            `${moment(i.timestamp).format(timeFormat)} ${cut} ${padded} [${fileType[i.level as LogLevel]}] ${i.message}`
          )
        },
      )

      if (console) {
        local.logger.configure({
          silent: disabled,
          level: level || 'info',
          transports: [new Winston.transports.Console()],
          format: Winston.format.combine(Winston.format.timestamp(), logFormat),
        })
      }

      if (filename || process.env.NODE_ENV === 'production') {
        local.fileLogger.configure({
          silent: disabled,
          level: level || 'info',
          transports: [new Winston.transports.File({ filename: filename || 'harmony.log' })],
          format: Winston.format.combine(Winston.format.timestamp(), fileFormat),
        })
      }

      // eslint-disable-next-line no-use-before-define
      return instance as ILogger
    },

    log(message: string|(() => string), ...meta: any[]) {
      local.logger.warn('Avoid using the \'log\' command, prefer \'info\', \'debug\' or \'warn\'')

      const levelPass = modes.indexOf(instance.level!) >= modes.indexOf('info')

      // eslint-disable-next-line no-nested-ternary
      const messageToLog = typeof message === 'function'
        ? (
          levelPass ? message() : ''
        )
        : message


      local.logger.debug(messageToLog, ...meta)
      local.fileLogger.debug(messageToLog, ...meta)

      return instance as ILogger
    },

    get level() {
      return local.logger.level as LogLevel
    },
    set level(level: LogLevel) {
      local.logger.level = level
      local.fileLogger.level = level
    },
  })

  instance.configure!(configuration)


  modes.forEach((mode) => {
    instance[mode] = (message: string|(() => string), ...meta: any[]) => {
      const levelPass = modes.indexOf(instance.level!) >= modes.indexOf(mode)

      // eslint-disable-next-line no-nested-ternary
      const messageToLog = typeof message === 'function'
        ? (
          levelPass ? message() : ''
        )
        : message

      local.logger[mode](messageToLog, ...meta)
      local.fileLogger[mode](messageToLog, ...meta)

      return instance as ILogger
    }
  })

  return instance as ILogger
}

export default Logger
