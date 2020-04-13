import { FastifyReply, FastifyRequest } from 'fastify'
import FastifyJWT from 'fastify-jwt'

import 'fastify-cookie'
import { CookieSerializeOptions } from 'cookie'
import * as jwt from 'jsonwebtoken'

import { Controller } from '@harmonyjs/types-server'

declare module 'fastify' {
  interface FastifyInstance<> {
    jwtAuthenticate: {
      block: (request: FastifyRequest, reply: FastifyReply<any>) => Promise<void>
      try: (request: FastifyRequest) => Promise<void>
    }
  }
}

type AuthenticationJWTConfig = {
  secret?: jwt.Secret | { public: jwt.Secret; private: jwt.Secret }
  cookie?: {
    cookieName: string,
  } & CookieSerializeOptions,
  decode?: jwt.DecodeOptions
  sign?: jwt.SignOptions
  verify?: jwt.VerifyOptions
  messages?: {
    badRequestErrorMessage?: string
    noAuthorizationInHeaderMessage?: string
    authorizationTokenExpiredMessage?: string
    authorizationTokenInvalid?: ((err: Error) => string) | string
    authorizationTokenUntrusted?: string
  }
  trusted?: (request: FastifyRequest, decodedToken: {[k: string]: any}) => boolean | Promise<boolean>
}

const ControllerAuthenticationJWT : Controller<AuthenticationJWTConfig> & {
  validator: string
} = (configuration) => ({
  name: 'ControllerAuthenticationJWT',
  global: true,

  async initialize({
    server,
    logger,
  }) {
    const { secret } = configuration

    if (!secret) {
      logger.warn('Please avoid using the default secret for authentication.')
      logger.warn('Provide your own secret through AuthenticationJWTConfig::secret')
    }

    await server.register(FastifyJWT, {
      sign: { algorithm: 'HS256' },
      ...configuration,
      secret: secret || 'harmony',
      cookie: configuration.cookie,
    })

    await server.decorate(ControllerAuthenticationJWT.validator, {
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
      get: (request: FastifyRequest) => request.user,
      create: (request: FastifyRequest, reply: FastifyReply<any>, payload : any, opts : any) => {
        const token = server.jwt.sign(payload, opts)
        if (configuration.cookie && configuration.cookie.cookieName) {
          reply.setCookie(configuration.cookie.cookieName, token, configuration.cookie)
        }
        return token
      },
    })

    logger.info('Authentication system initialized')
  },
})

ControllerAuthenticationJWT.validator = 'jwtAuthenticate'

export default ControllerAuthenticationJWT
