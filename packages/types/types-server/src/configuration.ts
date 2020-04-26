import { FastifyInstance } from 'fastify'
import { Server as SocketIO } from 'socket.io'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'

import { IController } from 'controller'

export type ServerConfig = {
  endpoint: {
    host: string
    port: number
  }
  controllers: IController[]
  socket: {
    path: string
  }
  cluster?: {
    redis: {
      key?: string
      host?: string
      port?: number
    }
  }
  log: LoggerConfig
}

export type ServerInstance = {
  readonly configuration: ServerConfig
  readonly logger: ILogger

  readonly server: FastifyInstance
  readonly socket: SocketIO

  initialize(configuration: Partial<ServerConfig>): Promise<void>
  close(): Promise<void>
}
