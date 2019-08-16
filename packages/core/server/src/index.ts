// Require Hapi
import Hapi from '@hapi/hapi'

// Require SocketIO
import IO from 'socket.io'
import IORedis from 'socket.io-redis'

// Require logger
import { LogConfig } from '@harmonyjs/types-logger'
import Logger from '@harmonyjs/logger'

// Require utils
import { getPluginsFromControllers, registerControllers, registerPlugins } from './utils/controllers'
import { executeOnCluster, ifMaster, ifWorker } from './utils/cluster'

// Require Auth Controller
import ControllerAuth from './auth'

type ServerConfig = {
  endpoint?: any,
  controllers?: any,
  authentication?: any,
  cluster?: any,
  log?: LogConfig,
}

export default class Server {
  config: ServerConfig = null

  logger = null

  server = null

  constructor(config: ServerConfig) {
    this.initializeProperties(config)
  }

  initializeProperties(config: ServerConfig = {}) {
    const {
      endpoint, controllers, authentication, cluster, log,
    } = config

    this.config = this.config || {}
    this.config.endpoint = endpoint || this.config.endpoint || { host: 'localhost', port: 3000 }
    this.config.controllers = controllers || this.config.controllers
    this.config.authentication = authentication || this.config.authentication
    this.config.cluster = cluster || this.config.cluster
    this.config.log = log || this.config.log
  }

  async init(config: ServerConfig) {
    this.initializeProperties(config)

    await this.createLogger()

    await this.createCluster()
  }

  async launch() {
    await this.logBanner()

    await this.createServer()

    await this.configureSocketIO()

    await this.configureAuthentication()

    await this.configureControllers()

    // Start the server
    await this.server.start()
  }

  async createServer() {
    const { endpoint } = this.config

    this.logger.info('Initializing Hapi Server')
    this.server = new Hapi.Server(endpoint)
  }

  async configureSocketIO() {
    const { cluster } = this.config

    // Create Socket.IO instance
    const io = IO(this.server.listener, {
      path: '/harmonyjs-socket',
    })

    // Add Redis layer if required
    if (cluster && cluster.redis) {
      io.adapter(IORedis(cluster.redis))
    }

    this.server.io = io
  }

  async configureAuthentication() {
    const { authentication } = this.config

    // Add Authentication
    this.logger.info('Initializing Authentication service...')
    const secret = authentication ? authentication.secret || '-' : '-'
    await ControllerAuth(this.server, authentication || { secret })
    this.logger.info('Authentication service initialized successfully')
  }

  async configureControllers() {
    const { controllers } = this.config

    // Check if any custom controllers need to be initialized
    if (controllers && controllers.length) {
      const plugins = getPluginsFromControllers({ controllers })

      await registerPlugins({ plugins, server: this.server })

      await registerControllers({ controllers, server: this.server, log: this.logger })
    }
  }

  createLogger = () => {
    const { log } = this.config
    const logConfig = log || {}

    // Append worker id to forks' filename
    ifWorker((worker) => {
      logConfig.filename = logConfig.filename && `[${worker.id}]_${(logConfig.filename)}`
    })

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

  // Node Cluster handling
  // Launch worker instances if required, connecting them to a master listener
  // for routing Socket.IO calls
  async createCluster() {
    const { cluster, endpoint, log } = this.config

    await executeOnCluster({
      cluster,
      prepare: () => {
        // Do not specify a listening port, and disable autoListen: the listening will be done on master
        const { port } = endpoint
        delete endpoint.port
        endpoint.autoListen = false

        return port
      },
      main: async () => this.launch(),
      worker: () => {
        // After initialization is done, re-enable logs
        this.logger.level = (log && log.level) || 'info'

        // Then return the worker's listener
        return this.server.listener
      },
      onWorkerMount: (worker) => {
        // Disable logs for workers except the first one
        if (worker.id > 1) {
          this.logger.level = 'error'
        }
      },
      onWorkerExit: (worker) => {
        this.logger.info(`Worker ${worker.id} (${worker.process.pid}) died`)
      },
      listen: (port) => {
        ifMaster(() => {
          // Add short delay to allow workers to get started
          setTimeout(() => {
            this.logger.info(
              `Main server created on port ${endpoint.host}:${port || endpoint.port}`,
            )
          }, 750)
        })
        ifWorker((worker) => this.logger.info(
          `Worker ${worker.id} (${worker.process.pid}) initialized`,
        ))
      },
    })
  }
}
