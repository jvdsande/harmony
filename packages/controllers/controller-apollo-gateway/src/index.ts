import {
  ApolloGateway, GatewayConfig, RemoteGraphQLDataSource, ServiceEndpointDefinition,
} from '@apollo/gateway'
import { ApolloServer, Config, ServerRegistration } from '@harmonyjs/apollo-fastify'
import { GraphQLRequest } from 'apollo-server-types'
import { RouteOptions } from 'fastify'

import { Controller } from '@harmonyjs/types-server'

type ApolloGatewayExperimental = {
  experimental_pollInterval?: number
  experimental_didUpdateComposition?: (newServices : any[], oldServices: any[]) => void
  logger: {
    disableAll(arg: boolean): void
  }
  startPollingServices(): void
}

let gatewayReference : ApolloGateway|ApolloGatewayExperimental|null = null
let firstComposition = true

function didUpdateComposition(callback : () => void, serviceNumber : number) {
  return function (services : any) {
    if (services.serviceDefinitions.length === serviceNumber && !firstComposition) {
      callback()
    }
    firstComposition = false
  }
}

/*
 * The Apollo Controller exposes a GraphQL endpoint through an Apollo Server
 */
const ControllerApolloGateway : Controller<{
  path: string,
  enablePlayground?: boolean,
  services: ServiceEndpointDefinition[],
  authentication?: Controller & { validator: string },

  gatewayConfig?: Omit<GatewayConfig, 'serviceList'|'buildService'>
  apolloConfig?: Omit<Config, 'gateway'|'playground'|'introspection'|'context'|'subscriptions'>
  routeConfig?: Omit<RouteOptions, 'auth'>

  servicePoller?: () => void
}> = function (config) {
  return ({
    name: 'ControllerApolloGateway',
    async initialize({ server, logger }) {
      const {
        path,
        enablePlayground,

        services,
        authentication,

        gatewayConfig,
        apolloConfig,
        routeConfig,
      } = config

      logger.info('Registering GraphQL Federation endpoint...')

      const gateway = gatewayReference as ApolloGateway || new ApolloGateway({
        ...(gatewayConfig || {}),
        serviceList: services,
        buildService({ url }) {
          return new RemoteGraphQLDataSource({
            url,
            willSendRequest({ request, context } : { request: GraphQLRequest, context: Record<string, any>}) {
              if (context.headers) {
                Object.keys(context.headers).forEach((header) => {
                  request.http!.headers.set(header, context.headers[header])
                })
              }
            },
          })
        },
      })

      if (config.servicePoller) {
        if (!gatewayReference) {
          logger.warn('Service polling enabled')
          logger.warn('This is a development feature only. Do not use in production!')
        }

        firstComposition = true
        gatewayReference = gateway as any as ApolloGatewayExperimental

        gatewayReference.experimental_pollInterval = 1000
        gatewayReference.logger.disableAll(true)
        gatewayReference.startPollingServices()
        gatewayReference.experimental_didUpdateComposition = didUpdateComposition(
          config.servicePoller,
          config.services.length,
        )
      }

      const apolloServer = new ApolloServer({
        ...(apolloConfig || {}),
        gateway,
        playground: !!enablePlayground,
        introspection: !!enablePlayground,
        context: (request) => ({
          headers: request.headers,
        }),
        subscriptions: false,
      })

      const routeOptions : ServerRegistration['routeOptions'] = { ...(routeConfig || {}) }
      if (authentication) {
        // @ts-ignore
        if (!server[authentication.validator]) {
          logger.error('The provided authentication controller was not initialized')
          logger.error(`Make sure the authentication controller ${
            authentication().name
          } is present in your controllers array and is before ${this.name}`)
          throw new Error('Missing controller')
        }

        const preValidation = []
        if (routeOptions.preValidation) {
          if (Array.isArray(routeOptions.preValidation)) {
            preValidation.push(...routeOptions.preValidation)
          } else {
            preValidation.push(routeOptions.preValidation)
          }
        }

        // @ts-ignore
        preValidation.push(server[authentication.validator].try)

        routeOptions.preValidation = preValidation
      }

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
