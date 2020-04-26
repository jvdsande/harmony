import Logger from '@harmonyjs/logger'

import { ServerInstance, IController } from '@harmonyjs/types-server'

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
  const internal : {
    -readonly [T in keyof ServerInstance]?: ServerInstance[T]
  } = {}

  const getInternalField = <F extends keyof ServerInstance>(f: F) : ServerInstance[F] => {
    if (internal[f]) {
      return internal[f] as ServerInstance[F]
    }

    throw new Error('You must call ServerInstance::initialize before accessing any other field!')
  }

  // Create an instance
  const instance : ServerInstance = {
    get configuration() {
      return getInternalField('configuration')
    },
    get logger() {
      return getInternalField('logger')
    },
    get server() {
      return getInternalField('server')
    },
    get socket() {
      return getInternalField('socket')
    },

    async initialize(configuration) {
      // Initialize properties and create logger
      internal.configuration = configureServer({ config: configuration || {} })
      internal.logger = Logger({ name: 'Server', configuration: internal.configuration.log })

      const { logger, configuration: config } = internal

      try {
        // Log Harmony banner
        await logBanner({ logger })

        // Create server instance (Fastify)
        internal.server = createServer({ logger })

        // Create socketIO instance
        internal.socket = createSocket({ config, logger, server: internal.server })

        // Start the server
        const { server, socket } = internal

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
    },

    async close() {
      if (instance.configuration.cluster && instance.configuration.cluster.redis) {
        // Close redis connection
        instance.socket.adapter().pubClient.quit()
        instance.socket.adapter().subClient.quit()
      }

      // Close Socket.IO connection
      instance.socket.close()

      // Close Fastify server
      return instance.server.close()
        .then(() => {})
        .catch(() => {})
    },
  }

  return instance
}
