import { FastifyReply, FastifyRequest } from 'fastify'
import FastifyJWT from 'fastify-jwt'

import { Controller } from '@harmonyjs/types-server'

declare module 'fastify' {
  interface FastifyInstance<> {
    authenticate: {
      block: (request: FastifyRequest, reply: FastifyReply<any>) => Promise<void>
      try: (request: FastifyRequest) => Promise<void>
    }
  }
}

type AuthenticationConfig = {
  secret: string,
}

const ControllerAuthentication : Controller<AuthenticationConfig> = (configuration) => ({
  name: 'ControllerAuthentication',
  global: true,

  async initialize({
    server,
    logger,
  }) {
    const { secret } = configuration

    if (secret === 'harmony') {
      logger.warn('Please avoid using the default secret for authentication.')
      logger.warn('Provide your own secret through ServerConfig::authentication::secret')
    }

    await server.register(FastifyJWT, {
      secret,
      sign: { algorithm: 'HS256' },
    })

    await server.decorate('authenticate', {
      block: async (request : FastifyRequest, reply : FastifyReply<any>) => {
        try {
          await request.jwtVerify()
        } catch (err) {
          reply.send(err)
        }
      },
      try: async (request : FastifyRequest) => {
        try {
          await request.jwtVerify()
        } catch (err) {
          // Ignore, just decoding
        }
      },
    })

    await server.decorateRequest('authentication', {
      getter() {
        const request : FastifyRequest = this
        return {
          get() {
            return request.user
          },
          create(payload : any, opts : any) {
            return server.jwt.sign(payload, opts)
          },
        }
      },
    })

    logger.info('Authentication system initialized')
  },
})

export default ControllerAuthentication
