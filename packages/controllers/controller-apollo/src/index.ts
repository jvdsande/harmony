import { ApolloServer, gql, Config , ServerRegistration} from '@harmonyjs/apollo-fastify'
import { PersistenceContext } from '@harmonyjs/types-persistence'

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

  context?: PersistenceContext,
  authentication?: Controller & { validator: string },

  apolloConfig?: Omit<Config, 'schema'|'playground'|'introspection'|'mocks'|'mockEntireSchema'|'context'>
  routeConfig?: ServerRegistration['routeOptions']
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
        authentication,

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
        context: (args) => {
          const reqContext : Record<string, any> = {}

          if(authentication) {
            reqContext.authentication = {
              get() {
                // @ts-ignore
                return server[authentication.validator].get(args.request, args.reply)
              },
              create(...payload : any) {
                // @ts-ignore
                return server[authentication.validator].create(args.request, args.reply, ...payload)
              },
            }
          }

          const objContext = context || {}

          Object.keys(objContext).forEach(key => {
            if(typeof objContext[key] === 'function') {
              reqContext[key] = (objContext[key] as Function)(args)
            } else {
              reqContext[key] = objContext[key]
            }
          })

          return reqContext
        },
      })

      const routeOptions : ServerRegistration['routeOptions'] = { ...(routeConfig || {}) }
      if(authentication) {
        // @ts-ignore
        if (!server[authentication.validator]) {
          logger.error('The provided authentication controller was not initialized')
          logger.error(`Make sure the authentication controller ${
            authentication().name
          } is present in your controllers array and is before ${this.name}`)
          throw new Error('Missing controller')
        }

        const preValidation = []
        if(routeOptions.preValidation) {
          if(Array.isArray(routeOptions.preValidation)) {
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
        routeOptions,
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
