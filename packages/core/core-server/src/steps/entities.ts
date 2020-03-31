// Import Fastify
import Fastify, { FastifyInstance } from 'fastify'
import FastifySensible from 'fastify-sensible'

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
export async function createServer({ logger } : CreateServerArgs) {
  logger.info('Initializing Fastify Server')

  // Create a Fastify server
  const instance = Fastify({
    ignoreTrailingSlash: true,
    modifyCoreObjects: false,
  })

  instance.register(FastifySensible, { errorHandler: false })
  instance.setErrorHandler((error, request, reply) => {
    if (reply.res.statusCode === 500 && (error as any).explicitInternalServerError !== true) {
      logger.error('Internal Server Error:', error)
      reply.send(new Error('Internal server error'))
    } else {
      reply.send(error)
    }
  })

  await instance.ready()

  return instance
}

type CreateSocketArgs = {
  logger: ILogger,
  config: ServerConfig,
  server: FastifyInstance,
}
export async function createSocket({ logger, config, server } : CreateSocketArgs) {
  const { cluster } = config

  // Create Socket.IO instance
  logger.info('Initializing Socket.IO layer')
  const socket = IO(
    server.server,
    {
      path: config.socket.path,
      serveClient: false,
      cookie: false,
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
