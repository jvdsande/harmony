// Require ApolloGraphql
import { ApolloServer } from 'apollo-server-hapi'
import { ApolloGateway, RemoteGraphQLDataSource } from '@apollo/gateway'
import { ServiceDefinition } from '@apollo/federation'

import { Controller } from '@harmonyjs/server'

/*
 * The Apollo Gateway Controller exposes a GraphQL endpoint through an Apollo Federation Gateway
 */
export default class ControllerApolloGateway extends Controller {
  name = 'ControllerApolloGateway'

  config : {
    path: string,
    enablePlayground?: boolean,
    services: ServiceDefinition[]
  }

  async initialize({ server, logger }) {
    const {
      path,
      enablePlayground,
      services,
    } = this.config
    logger.info('Registering GraphQL Federation endpoint...')

    const gateway = new ApolloGateway({
      serviceList: services,
      buildService({ name, url }) {
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
      },
    })

    logger.info(`GraphQL Federation endpoint at ${path}`)
    if (enablePlayground) {
      logger.info(`GraphQL Federation playground at ${path}`)
    }
  }
}
