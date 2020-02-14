// Require ApolloGraphql
import { ApolloServer, Config } from 'apollo-server-hapi'
import { ApolloGateway, RemoteGraphQLDataSource, GatewayConfig } from '@apollo/gateway'
import { ServiceDefinition } from '@apollo/federation'

import { RouteOptions } from 'hapi'

import { Controller } from '@harmonyjs/types-server'

/*
 * The Apollo Gateway Controller exposes a GraphQL endpoint through an Apollo Federation Gateway
 */
export default class ControllerApolloGateway extends Controller {
  name = 'ControllerApolloGateway'

  config : {
    path: string,
    enablePlayground?: boolean,
    services: ServiceDefinition[],

    gatewayConfig?: Omit<GatewayConfig, 'serviceList'|'buildService'>
    apolloConfig?: Omit<Config, 'gateway'|'playground'|'introspection'|'context'|'subscriptions'>
    routeConfig?: Omit<RouteOptions, 'auth'>
  }

  constructor(config) { // eslint-disable-line
    super(config)
  }

  async initialize({ server, logger }) {
    const {
      path,
      enablePlayground,
      services,

      gatewayConfig,
      apolloConfig,
      routeConfig,
    } = this.config
    logger.info('Registering GraphQL Federation endpoint...')

    const gateway = new ApolloGateway({
      ...(gatewayConfig || {}),
      serviceList: services,
      buildService({ url }) {
        return new RemoteGraphQLDataSource({
          url,
          willSendRequest({ request, context }) {
            // pass the user's id from the context to underlying services
            // as a header called `user-id`
            // @ts-ignore
            request.http.headers.set('authentication', context.authentication.get())
          },
        })
      },
    })

    const apolloServer = new ApolloServer({
      ...(apolloConfig || {}),
      gateway,

      playground: !!enablePlayground,
      introspection: !!enablePlayground,
      context: ({ request }) => ({
        authentication: request.authentication,
      }),
      subscriptions: false,
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

    logger.info(`GraphQL Federation endpoint at ${path}`)
    if (enablePlayground) {
      logger.info(`GraphQL Federation playground at ${path}`)
    }
  }
}
