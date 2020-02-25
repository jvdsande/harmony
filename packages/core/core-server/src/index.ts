import Logger from '@harmonyjs/logger'

import { ServerConfig, ServerInstance, IController } from '@harmonyjs/types-server'

import ControllerAuthentication from 'controllers/authentication'

import {
  configureServer,
} from 'steps/configuration'
import {
  createServer, createSocket,
} from 'steps/entities'
import {
  logBanner, registerControllers, separateUpgradeListeners, startListening,
} from 'steps/launch'

export default function Server(deprecatedConfig?: Partial<ServerConfig>) : ServerInstance {
  // Create an instance
  const instance : Partial<ServerInstance> = {}

  instance.initialize = async (configuration: Partial<ServerConfig>) => {
    // Initialize properties and create logger
    instance.configuration = configureServer({ config: configuration || {} })
    instance.logger = Logger({ name: 'Server', configuration: instance.configuration.log })

    const { logger, configuration: config } = instance

    if (deprecatedConfig) {
      instance.logger.warn(
        '[Deprecation Notice] Passing configuration in the constructor is deprecated and will be removed in the '
        + 'next minor. Pass the configuration to Server::initialize instead',
      )
    }

    // Create server instance (Fastify)
    instance.server = createServer({ logger })

    // Create socketIO instance
    instance.socket = createSocket({ config, logger, server: instance.server })

    // Start the server
    const { server, socket } = instance

    try {
      // Log Harmony banner
      await logBanner({ logger })

      // Register Authentication Controller
      const controllers : IController[] = [
        ControllerAuthentication(config.authentication || { secret: 'harmony' }),
        ...(config.controllers || []),
      ]

      // Register controllers
      await registerControllers({
        server, socket, controllers, logger, config,
      })

      // Separate upgrade listeners
      await separateUpgradeListeners({ server })

      // Start listening
      await startListening({ server, logger, config })
    } catch (err) {
      logger.error(err)
      throw new Error('Error while creating server')
    }
  }


  // @deprecated
  instance.init = async (initConfig?: Partial<ServerConfig>) => {
    await instance.initialize!(initConfig || deprecatedConfig || {})

    instance.logger!.warn(
      '[Deprecation Notice] Server::init is deprecated and will be removed in the next minor. '
      + 'Use Server::initialize instead.',
    )
  }

  return instance as ServerInstance
}
