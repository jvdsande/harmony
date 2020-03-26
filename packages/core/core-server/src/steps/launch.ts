// Import types
import { FastifyInstance } from 'fastify'
import fp from 'fastify-plugin'
import { Server as SocketIO } from 'socket.io'

import { ServerConfig, IController } from '@harmonyjs/types-server'

import Logger, { ILogger } from '@harmonyjs/logger'


type LogBannerArgs = {
  logger: ILogger,
}
export async function logBanner({ logger } : LogBannerArgs) {
  logger.info(
    `Powered by
   _    _
  | |  | |
  | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
  |  __  |/ _\` | '__| '_ \` _ \\ / _ \\| '_ \\| | | |
  | |  | | (_| | |  | | | | | | (_) | | | | |_| |
  |_|  |_|\\__,_|_|  |_| |_| |_|\\___/|_| |_|\\__, |
                                            __/ |
                                           |___/`,
  )
}

async function chainedPromises(promiseTriggers : (() => Promise<any>)[]) {
  const launchNext = async () => {
    const trigger = promiseTriggers.shift()

    if (!trigger) {
      return
    }

    await trigger().then(launchNext)
  }

  await launchNext()
}

type RegisterControllersArgs = {
  server: FastifyInstance,
  socket: SocketIO,
  controllers: IController[],
  logger: ILogger,
  config: ServerConfig
}
export async function registerControllers({
  server, socket, controllers, logger, config,
} : RegisterControllersArgs) {
  controllers.map((controller) => {
    const pluginRegistration = async (instance: FastifyInstance, options: any, done: Function) => {
      try {
        const controllerLogger = Logger({ name: controller.name, configuration: config.log })

        await controller.initialize({
          server: instance,
          socket,
          logger: controllerLogger,
        })

        done()
      } catch (err) {
        logger.error(`An error occurred while initializing controller ${controller.name}`)
        throw err
      }
    }

    const plugin = controller.global ? fp(pluginRegistration) : pluginRegistration

    server.register(plugin)
  })

  await server.ready()
}

type SeparateUpgradeListenersArgs = {
  server: FastifyInstance,
  config: ServerConfig,
}
export async function separateUpgradeListeners({ server, config } : SeparateUpgradeListenersArgs) {
  const listeners = server.server.listeners('upgrade')
  const harmonyListener = listeners.shift()


  let harmonySocketPath = config.socket.path
  if (!harmonySocketPath.startsWith('/')) {
    harmonySocketPath = `/${harmonySocketPath}`
  }
  if (!harmonySocketPath.endsWith('/')) {
    harmonySocketPath = `${harmonySocketPath}/`
  }

  server.server.removeAllListeners('upgrade')
  server.server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith(harmonySocketPath) && harmonyListener) {
      // If the path starts with /harmonyjs-socket, forward it to the
      // harmony socket-io listener
      harmonyListener(req, socket, head)
    } else {
      // Else, forward it to all other listeners, which should handle it gracefully
      // Note: if a controller uses socket-io, then it _will_ fail on upgrade requests
      listeners.forEach((l) => l(req, socket, head))
    }
  })
}

type StartListeningArgs = {
  server: FastifyInstance,
  logger: ILogger,
  config: ServerConfig,
}
export async function startListening({ server, logger, config } : StartListeningArgs) {
  const { endpoint } = config

  await server.ready()
  await server.listen(endpoint.port, endpoint.host)

  logger.info(`Main server created on port ${endpoint.host}:${endpoint.port}`)
}
