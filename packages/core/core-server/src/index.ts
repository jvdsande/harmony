import Logger from '@harmonyjs/logger'

import { ServerConfig, ServerInstance, IController } from '@harmonyjs/types-server'

import {
  configureServer,
} from 'steps/configuration'
import {
  createServer, createSocket,
} from 'steps/entities'
import {
  logBanner, registerControllers, separateUpgradeListeners, startListening,
} from 'steps/launch'

export {
  ServerConfig, ServerInstance, Controller, IController,
} from '@harmonyjs/types-server'
export {
  default as HttpErrors, IHttpErrors,
} from 'utils/errors'

export default function Server() : ServerInstance {
  // Create an instance
  const instance : Partial<ServerInstance> = {}

  instance.initialize = async (configuration: Partial<ServerConfig>) => {
    // Initialize properties and create logger
    instance.configuration = configureServer({ config: configuration || {} })
    instance.logger = Logger({ name: 'Server', configuration: instance.configuration.log })

    const { logger, configuration: config } = instance


    try {
      // Log Harmony banner
      await logBanner({ logger })

      // Create server instance (Fastify)
      instance.server = createServer({ logger })

      // Create socketIO instance
      instance.socket = createSocket({ config, logger, server: instance.server })

      // Start the server
      const { server, socket } = instance

      // Register Authentication Controller
      const controllers : IController[] = [
        ...(config.controllers || []),
      ]

      // Register controllers
      await registerControllers({
        server, socket, controllers, logger, config,
      })

      // Separate upgrade listeners
      await separateUpgradeListeners({ server, config })

      // Start listening
      await startListening({ server, logger, config })
    } catch (err) {
      logger.error(err)
      throw new Error('Error while creating server')
    }
  }

  instance.close = async () => {
    const inst = (instance as ServerInstance)
    if (inst.configuration.cluster && inst.configuration.cluster.redis) {
      // Close redis connection
      inst.socket.adapter().pubClient.quit()
      inst.socket.adapter().subClient.quit()
    }

    // Close Socket.IO connection
    inst.socket.close()

    // Close Fastify server
    return inst.server.close()
      .then(() => {})
      .catch(() => {})
  }

  return instance as ServerInstance
}
