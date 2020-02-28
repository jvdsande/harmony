// Import Fastify
import Fastify, { FastifyInstance } from 'fastify'

// Import SocketIO
import IO from 'socket.io'
import IORedis from 'socket.io-redis'

// Import configuration types
import { ServerConfig } from '@harmonyjs/types-server'

// Import Logger
import { ILogger } from '@harmonyjs/logger'


type CreateServerArgs = {
  logger: ILogger,
}
export function createServer({ logger } : CreateServerArgs) {
  logger.info('Initializing Fastify Server')

  // Create a Fastify server
  return Fastify({
    ignoreTrailingSlash: true,
    modifyCoreObjects: false,
  })
}

type CreateSocketArgs = {
  logger: ILogger,
  config: ServerConfig,
  server: FastifyInstance,
}
export function createSocket({ logger, config, server } : CreateSocketArgs) {
  const { cluster } = config

  // Create Socket.IO instance
  logger.info('Initializing Socket.IO layer')
  const socket = IO(
    server.server,
    {
      path: '/harmonyjs-socket',
      serveClient: false,
    },
  )

  // Add Redis layer if required
  if (cluster && cluster.redis) {
    const redis = {
      key: cluster.redis.key || 'harmony',
      host: cluster.redis.host || 'localhost',
      port: cluster.redis.port || 6379,
    }

    logger.info('Initializing Socket.IO Redis Adapter')
    const redisAdapter = IORedis(redis)
    let lastRedisError : string|null = null
    // @ts-ignore
    redisAdapter.prototype.on('error', (err) => {
      if (lastRedisError !== err.message) {
        logger.error(err.message)
      }
      lastRedisError = err.message
    })
    redisAdapter.subClient.on('ready', () => {
      logger.info('Socket.IO Redis Adapter connected')

      lastRedisError = null
    })
    socket.adapter(redisAdapter)
  }

  return socket
}
