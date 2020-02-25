import { ApolloServer, gql, Config } from '@harmonyjs/apollo-fastify'
import { RouteOptions } from 'fastify'

import { buildFederatedSchema } from '@apollo/federation'

import { Controller } from '@harmonyjs/types-server'

/*
 * The Apollo Controller exposes a GraphQL endpoint through an Apollo Server
 */
const ControllerApollo : Controller<{
  path: string,
  enablePlayground?: boolean,
  mock?: boolean,

  schema: string,
  resolvers: {
    [key: string]: any
  },

  context?: {
    [key: string]: any
  },

  apolloConfig?: Omit<Config, 'schema'|'playground'|'introspection'|'mocks'|'mockEntireSchema'|'context'>
  routeConfig?: Omit<RouteOptions, 'auth'>
}> = function ControllerApollo(config) {
  return ({
    name: 'ControllerApollo',
    async initialize({ server, logger }) {
      const {
        path,
        enablePlayground,

        schema,
        resolvers,
        mock,

        context,

        apolloConfig,
        routeConfig,
      } = config

      logger.info('Registering GraphQL endpoint...')

      const typeDefs = gql(schema)

      const apolloServer = new ApolloServer({
        ...(apolloConfig || {}),
        schema: buildFederatedSchema([{ typeDefs, resolvers }]),
        playground: !!enablePlayground,
        introspection: !!enablePlayground,
        mocks: mock,
        mockEntireSchema: mock,
        context: (request) => ({
          ...(context || {}),
          authentication: request.authentication,
        }),
      })

      await server.register(apolloServer.createHandler({
        path,
        cors: true,
        routeOptions:
          {
            ...(routeConfig || {}),
            // @ts-ignore
            preValidation: [server.authenticate.try],
          },
      }))

      await apolloServer.installSubscriptionHandlers(server.server)

      logger.info(`GraphQL endpoint at ${path}`)
      if (enablePlayground) {
        logger.info(`GraphQL playground at ${path}`)
      }
    },
  })
}

export default ControllerApollo
