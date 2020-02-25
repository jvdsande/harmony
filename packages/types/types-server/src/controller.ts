import { FastifyInstance } from 'fastify'
import { Server as SocketIO } from 'socket.io'

import { ILogger } from '@harmonyjs/logger'

export interface IController {
  name: string
  global?: boolean
  initialize(args: {
    server: FastifyInstance
    socket: SocketIO
    logger: ILogger
  }): Promise<void>
}

export type Controller<T = void> = (configuration: T) => IController
