// Require Cluster
import Cluster from 'cluster'

// Require Hapi
import Hapi from '@hapi/hapi'

// Require SocketIO
import IO from 'socket.io'
import IORedis from 'socket.io-redis'
import Sticky from 'socketio-sticky-session'

// Require Logger for logs
import Logger from '@harmonyjs/logger'

import {
  ServerConfiguration, GraphqlConfig, Address,
} from '@harmonyjs/typedefs/server'
import {
  LogConfig,
} from '@harmonyjs/typedefs/logger'

// Require auth controller
import ControllerAuth from './auth'

// Require plugins to export them
import PluginSPA from './plugins/spa'

export const ControllerSPA = PluginSPA

/*
 * Class Server : initialize a Server instance for a Harmony App
 */
export default class Server {
  logger: Logger

  server: any

  port?: number

  /**
   * Constructor function
   * @param {object} config - Configuration options (optional)
   */
  constructor(config?: ServerConfiguration) {
    if (config) {
      this.init(config)
    }
  }

  /**
   * Init function
   * @param {object} config - Configuration options
   */
  init = async (config: ServerConfiguration) => {
    const {
      cluster,
      graphql,
      log = {},
    } = config

    this.createLogger(log)

    // Launch the actual init only on forks in clustered mode, and in master if not in clustered mode
    if (!cluster || !cluster.sticky || cluster.sticky.size < 2 || !Cluster.isMaster) {
      await this.slave(config)
    } else {
      Cluster.on('exit', (worker) => {
        this.logger.info(`worker ${worker.process.pid} died`)
      })
    }

    if (cluster && cluster.sticky && cluster.sticky.size > 2) {
      if (Cluster.isMaster) {
        await this.master(config)
      }

      Sticky(
        {
          proxy: cluster.sticky.proxy, // activate layer 4 patching
          header: cluster.sticky.header || 'x-forwarded-for',
          ignoreMissingHeader: true,
          num: (cluster.sticky.size) || 1,
        },
        () => {
          this.logger.level = log.level || 'info'
          return this.server.listener
        },
      )
        .listen(this.port, () => {
          this.success({
            endpoint: `${this.server.info && this.server.info.uri}:${Number(this.port)}`,
            graphql,
          })
        })
    } else {
      this.success({
        endpoint: this.server.info.uri,
        graphql,
      })
    }
  }

  createLogger = (log: LogConfig) => {
    const logConfig = log || {}

    // Append worker id to forks' filename
    if (!Cluster.isMaster) {
      logConfig.filename = logConfig.filename && `[${Cluster.worker.id}]_${(logConfig.filename)}`
    }

    // Prepare the logger
    this.logger = new Logger('Server', logConfig)
  }

  logBanner = () => {
    const { logger } = this

    logger.info(`Powered by
  _    _
 | |  | |
 | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
 |  __  |/ _\` | '__| '_ \` _ \\ / _ \\| '_ \\| | | |
 | |  | | (_| | |  | | | | | | (_) | | | | |_| |
 |_|  |_|\\__,_|_|  |_| |_| |_|\\___/|_| |_|\\__, |
                                           __/ |
                                          |___/`)
  }

  master = async ({
    addresses,
    cluster,
    graphql,
    persistence,
    endpoint,
  }: ServerConfiguration) => {
    this.logBanner()

    const address: Address = endpoint || addresses.endpoint || {
      host: 'localhost',
    }

    if (!endpoint && addresses.endpoint) {
      this.logger.warn('\'addresses.endpoint\' has been deprecated. Please use \'endpoint\' directly.')
    }

    this.port = address.port
    delete address.port
    address.autoListen = false

    // Create the server
    const server = new Hapi.Server(address)
    this.server = server

    // Create Socket.IO instance
    const io = IO(server.listener, {
      path: '/harmonyjs-socket',
    })
    if (cluster && cluster.redis) {
      io.adapter(IORedis(cluster.redis))
    }
  }

  slave = async ({
    addresses, // Deprecated
    endpoint,
    persistence,
    cluster,
    authentication,
    web,
    graphql,
    log,
    controllers,
  }: ServerConfiguration) => {
    const logConfig = log || {}
    const { logger } = this

    // Disable startup logs for workers > 1
    if (!Cluster.isMaster) {
      logger.info(`Cluster Mode! Instance ${Cluster.worker.id} running`)

      if (Cluster.worker.id > 1) {
        logger.level = 'error'
      }
    }

    if (Cluster.isMaster) {
      this.logBanner()
    }

    const address: Address = endpoint || addresses.endpoint || {
      host: 'localhost',
    }

    if (!endpoint && addresses.endpoint) {
      this.logger.warn('\'addresses.endpoint\' has been deprecated. Please use \'endpoint\' directly.')
    }

    if (!Cluster.isMaster) {
      this.port = address.port
      delete address.port
      address.autoListen = false
    }

    // Create the server
    const server = new Hapi.Server(address)
    this.server = server

    // Create Socket.IO instance
    const io = IO(server.listener, {
      path: '/harmonyjs-socket',
    })
    if (cluster && cluster.redis) {
      io.adapter(IORedis(cluster.redis))
    }

    // Call all controllers

    const registeredPlugins = []

    // Add Authentication
    logger.info('Initializing Authentication service...')
    const secret = authentication ? authentication.secret || '-' : '-'
    await ControllerAuth(server, authentication || { secret })
    logger.info('Authentication service initialized successfully')

    // If a persistence object has been given, initialize the Persistence system
    if (persistence) {
      logger.info('Persistence found! Adding Socket.IO layer...')

      persistence.configureIO({ io })

      logger.info('Socket.IO layer added successfully.')
      logger.info('Initializing GraphQL endpoint...')

      const plugin = {
        name: 'harmonyjs-persistence',
        register: persistence.controller.initialize,
      }
      await server.register(plugin)

      logger.info('GraphQL endpoint initialized successfully')
    }

    const pluginsToRegister = []

    // Check if any custom controllers need to be initialized
    if (controllers && controllers.length) {
      controllers.forEach((c) => {
        if (c.plugins && c.plugins.length) {
          c.plugins.forEach((plugin) => {
            let name = null

            // Check if the plugin is using the ".plugin" definition
            if (plugin.plugin) {
              // If it is, check if we are embedding it in a plugin/options object
              if (plugin.plugin.plugin) {
                name = plugin.plugin.plugin.pkg.name
              } else {
                name = plugin.plugin.pkg.name
              }
            } else {
              name = plugin.pkg.name
            }

            if (registeredPlugins.indexOf(name) < 0) {
              pluginsToRegister.push(plugin)
              registeredPlugins.push(name)
            }
          })
        }
      })

      // Register all necessary plugins
      await Promise.all(pluginsToRegister.map(p => server.register(p)))

      await Promise.all(controllers.map((c, i) => {
        const plugin = {
          name: `harmonyjs-${i}`,
          register: c.initialize,
        }

        return server.register(plugin)
      }))
    }

    // Start the server
    await server.start()

    // Re-enable logs for workers > 1
    if (!Cluster.isMaster && Cluster.worker.id > 1 && logConfig.level) {
      logger.level = logConfig.level
    }

    logger.info('All initialization successful')
  }

  success = ({
    endpoint,
    graphql,
  } : {
    endpoint: string,
    graphql?: GraphqlConfig,
  }) => {
    if (Cluster.isMaster) {
      this.logger.info(`App running at: ${endpoint}`)
    }
  }
}
