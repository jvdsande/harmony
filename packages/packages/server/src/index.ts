// @flow

// Require Cluster
import Cluster from 'cluster'

// Require Hapi
import Hapi from 'hapi'

// Require SocketIO
import IO from 'socket.io'
import IORedis from 'socket.io-redis'
import Sticky from 'socketio-sticky-session'

// Require JWT
import JWT from 'jsonwebtoken'

// Require Logger for logs
import Logger from '@foundationjs/logger'

import {
  ServerConfiguration, GraphqlConfig, Address,
} from '@foundationjs/typedefs/server'
import {
  LogConfig,
} from '@foundationjs/typedefs/logger'

// Require controllers
import ControllerAuth from './controllers/auth'
import ControllerWeb from './controllers/web'
import ControllerHMR from './controllers/hmr'
import ControllerGraphQL from './controllers/graphql'

// Require plugins to export them
import PluginSPA from './plugins/spa'

export const ControllerSPA = PluginSPA

/*
 * Class Server : initialize a Server instance for a Foundation App
 */
export default class Server {
  logger: Logger

  server: any

  port?: number

  usingGraphQL: boolean = false

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
  ______                    _       _   _                    _  _____ 
 |  ____|                  | |     | | (_)                  | |/ ____|
 | |__ ___  _   _ _ __   __| | __ _| |_ _  ___  _ __        | | (___  
 |  __/ _ \\| | | | '_ \\ / _\` |/ _\` | __| |/ _ \\| '_ \\   _   | |\\___ \\ 
 | | | (_) | |_| | | | | (_| | (_| | |_| | (_) | | | | | |__| |____) |
 |_|  \\___/ \\__,_|_| |_|\\__,_|\\__,_|\\__|_|\\___/|_| |_|  \\____/|_____/`)
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
    const server = Hapi.server(address)
    this.server = server

    // Create Socket.IO instance
    const io = IO(server.listener, {
      path: '/foundationjs-socket',
    })
    if (cluster && cluster.redis) {
      io.adapter(IORedis(cluster.redis))
    }

    // Checking if GraphQL will be used
    this.usingGraphQL = (!!graphql) && (!!graphql.schema || (!!persistence && !!persistence.schema))
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

      // Checking if GraphQL will be used
      this.usingGraphQL = (!!graphql) && (!!graphql.schema || (!!persistence && !!persistence.schema))
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
    const server = Hapi.server(address)
    this.server = server

    // Create Socket.IO instance
    const io = IO(server.listener, {
      path: '/foundationjs-socket',
    })
    if (cluster && cluster.redis) {
      io.adapter(IORedis(cluster.redis))
    }

    // Call all controllers

    const registeredPlugins = []

    // Add Authentication
    logger.info('Initializing Authentications service...')
    const secret = authentication ? authentication.secret || '-' : '-'
    await ControllerAuth(server, authentication || { secret })
    logger.info('Authentication service initialized successfully')

    // Deprecated: Web configuration
    if (web) {
      logger.warn(
        'Using the built-in Web service is now Deprecated. Please use SPAController or GatsbyController instead',
      )

      // Add Web routes (static serving + global redirect)
      logger.info('Initializing Web routes service...')
      await ControllerWeb(server, {
        ...web,
        logger: this.logger,
      })
      logger.info('Web routes service initialized successfully')

      // In dev mode, add Webpack redirect
      if (process.env.NODE_ENV === 'development') {
        logger.info('Initializing HMR service...')
        await ControllerHMR(server, addresses.webpack)
        logger.info('HMR service initialized successfully')
      }

      registeredPlugins.push('h2o2', 'vision', 'inert')
    }


    // If a persistence object has been given, initialize the Persistence system
    if (persistence) {
      logger.info('Persistence found! Adding Socket.IO layer...')

      persistence.configureIO({ io })

      logger.info('Socket.IO layer added successfully.')
    }

    // If a graphql object has been given, initialize the GraphQL engine
    if (graphql) {
      logger.info('GraphQL config found! Adding GraphQL engine...')

      // Create GraphQL schema
      const schema = graphql.schema || (persistence && persistence.schema)

      if (persistence && persistence.schema && schema === persistence.schema) {
        logger.info('GraphQL is using the Persistence instance as schema')
      } else if (schema === graphql.schema) {
        logger.info('Using custom GraphQL schema provided')
      }

      if (!schema) {
        logger.error(
          'You must provide a GraphQL schema to use GraphQL! '
          + 'Either use `graphql.schema` or provide a Persistence instance.',
        )
        logger.error('Failed to add GraphQL engine, GraphQL will not work.')
      } else {
        // Add GraphQL engine and routes

        await ControllerGraphQL(server, {
          ...graphql,
          graphqlOptions: async (req) => {
            const res = graphql.graphqlOptions ? await graphql.graphqlOptions(req) : {}

            return {
              context: {
                ...res,
                authentication: {
                  create: (payload, options) => JWT.sign(payload, secret, options),
                  get: () => req.auth.credentials,
                },
              },
              schema,
            }
          },
        })


        logger.info('GraphQL engine added successfully')
      }
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
          name: `foundationjs-${i}`,
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

      if (this.usingGraphQL && !!graphql) {
        this.logger.info(`GraphQL endpoint at: ${endpoint}${graphql.graphql}`)

        if (graphql.enableGraphiQL && !!graphql.graphiql) {
          this.logger.info(`Graph(i)QL dashboard at: ${endpoint}${graphql.graphiql}`)
        }
      }
    }
  }
}
