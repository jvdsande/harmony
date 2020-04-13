import { FastifyReply, FastifyRequest } from 'fastify'
import FastifySession from 'fastify-session'
import MemoryStore from 'memorystore'

import 'fastify-cookie'

import { Controller, HttpErrors } from '@harmonyjs/server'


declare module 'fastify' {
  interface FastifyInstance<> {
    sessionAuthenticate: {
      block: (request: FastifyRequest, reply: FastifyReply<any>) => Promise<void>
      try: (request: FastifyRequest) => Promise<void>
    }
  }
}

type AuthenticationSessionConfig = Omit<FastifySession.Options, 'secret'> & {
  secret?: FastifySession.Options['secret']
}

const ControllerAuthenticationSession : Controller<AuthenticationSessionConfig> & {
  validator: string
} = (configuration) => ({
  name: 'ControllerAuthenticationJWT',
  global: true,

  async initialize({
    server,
    logger,
  }) {
    const { secret, saveUninitialized, store } = configuration

    if (!secret) {
      logger.warn('Please avoid using the default secret for authentication.')
      logger.warn('Provide your own secret through AuthenticationSessionConfig::secret')
    }

    await server.register(FastifySession, {
      ...configuration,
      secret: secret || 'harmony-default-auth-session-secret',
      store: store || new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000,
      }),
      saveUninitialized: saveUninitialized || false,
    })

    await server.decorate(ControllerAuthenticationSession.validator, {
      block: async (request : FastifyRequest, reply : FastifyReply<any>) => {
        if (!request.session || !request.session.payload) {
          reply.send(HttpErrors.Unauthorized('No session found'))
        }
      },
      try: async () => {
        // Do nothing
      },
      get: (request : FastifyRequest) => request.session && request.session.payload,
      create: (request : FastifyRequest, reply: FastifyReply<any>, payload : any) => {
        request.session.payload = payload
      },
    })

    logger.info('Authentication system initialized')
  },
})

ControllerAuthenticationSession.validator = 'sessionAuthenticate'

export default ControllerAuthenticationSession
