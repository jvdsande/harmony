// @flow

import JWT from 'hapi-auth-jwt2'
import type { AuthenticationConfig } from '@foundationjs/flowtypes/server'

export default async function (server: Object, { secret, validate }: AuthenticationConfig) {
  await server.register(JWT)

  // Set the Authentication strategy to JWT
  server.auth.strategy(
    'jwt', 'jwt',
    {
      key: secret,
      validate: validate || (async () => true), // validate function
      verifyOptions: { algorithms: ['HS256'] }, // pick a strong algorithm
      urlKey: false,
    },
  )
}
