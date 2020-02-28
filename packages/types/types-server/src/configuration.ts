import { FastifyInstance } from 'fastify'
import { Server as SocketIO } from 'socket.io'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'

import { IController } from 'controller'

export type ServerConfig = {
  endpoint: {
    host: string,
    port: number,
  },
  controllers: IController[],
  authentication?: {
    secret: string,
  },
  cluster?: {
    redis: {
      key?: string,
      host?: string,
      port?: number,
    },
  },
  log: LoggerConfig,
}

export type ServerInstance = {
  configuration: ServerConfig,
  logger: ILogger,

  server: FastifyInstance,
  socket: SocketIO,

  initialize(configuration: Partial<ServerConfig>): Promise<void>
  close(): Promise<void>
}
