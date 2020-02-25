import { ApolloGateway, GatewayConfig, RemoteGraphQLDataSource, ServiceEndpointDefinition } from '@apollo/gateway'
import { ApolloServer, Config } from '@harmonyjs/apollo-fastify'
import { RouteOptions } from 'fastify'

import { Controller } from '@harmonyjs/types-server'

/*
 * The Apollo Controller exposes a GraphQL endpoint through an Apollo Server
 */
const ControllerApolloGateway : Controller<{
  path: string,
  enablePlayground?: boolean,
  services: ServiceEndpointDefinition[],

  gatewayConfig?: Omit<GatewayConfig, 'serviceList'|'buildService'>
  apolloConfig?: Omit<Config, 'gateway'|'playground'|'introspection'|'context'|'subscriptions'>
  routeConfig?: Omit<RouteOptions, 'auth'>
}> = function(config) {
  return ({
    name: 'ControllerApolloGateway',
    async initialize({ server, logger }) {
      const {
        path,
        enablePlayground,

        services,

        gatewayConfig,
        apolloConfig,
        routeConfig,
      } = config

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
              // request.http.headers.set('authentication', context.authentication.get())
            },
          })
        },
      })

      const apolloServer = new ApolloServer({
        ...(apolloConfig || {}),
        gateway,
        playground: !!enablePlayground,
        introspection: !!enablePlayground,
        context: (request) => {
          return ({
            authentication: request.authentication,
          })
        },
        subscriptions: false,
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

      logger.info(`GraphQL endpoint at ${path}`)
      if (enablePlayground) {
        logger.info(`GraphQL playground at ${path}`)
      }
    },
  })
}

export default ControllerApolloGateway
