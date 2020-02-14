// Require ApolloGraphql
import { ApolloServer, gql, Config } from 'apollo-server-hapi'
import { buildFederatedSchema } from '@apollo/federation'

import { RouteOptions } from '@hapi/hapi'

import { Controller } from '@harmonyjs/types-server'

/*
 * The Apollo Controller exposes a GraphQL endpoint through an Apollo Server
 */
export default class ControllerApollo extends Controller {
  name = 'ControllerApollo'

  config : {
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
  }

  constructor(config) { // eslint-disable-line
    super(config)
  }

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
    } = this.config

    logger.info('Registering GraphQL endpoint...')

    const typeDefs = gql(schema)

    const apolloServer = new ApolloServer({
      ...(apolloConfig || {}),
      schema: buildFederatedSchema([{ typeDefs, resolvers }]),
      playground: !!enablePlayground,
      introspection: !!enablePlayground,
      mocks: mock,
      mockEntireSchema: mock,
      context: ({ request }) => ({
        ...context,
        authentication: request.authentication,
      }),
    })

    await apolloServer.applyMiddleware({
      app: server,
      path,
      route: {
        auth: {
          strategy: 'jwt',
          mode: 'try',
        },
        cors: true,
        ...(routeConfig || {}),
      },
    })

    await apolloServer.installSubscriptionHandlers(server.listener)

    logger.info(`GraphQL endpoint at ${path}`)
    if (enablePlayground) {
      logger.info(`GraphQL playground at ${path}`)
    }
  }
}
