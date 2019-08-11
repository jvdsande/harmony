// Require JWT
import JWT from 'jsonwebtoken'
import HapiJWT from 'hapi-auth-jwt2'
import { AuthenticationConfig } from '@harmonyjs/typedefs/server'

export default async function (server: any, { secret, validate }: AuthenticationConfig) {
  await server.register(HapiJWT)

  // Set the Authentication strategy to JWT
  server.auth.strategy(
    'jwt', 'jwt',
    {
      key: secret,
      validate: (decoded, request, h) => {
        if (validate) {
          return validate(decoded, request, h)
        }

        return true
      }, // validate function
      verifyOptions: { algorithms: ['HS256'] }, // pick a strong algorithm
      urlKey: false,
    },
  )

  await server.ext({
    type: 'onRequest',
    method: (request, h) => {
      request.authentication = {
        create: (payload, opts) => JWT.sign(payload, secret, opts),
        get: () => request.auth.credentials,
      }

      return h.continue
    },
  })
}
