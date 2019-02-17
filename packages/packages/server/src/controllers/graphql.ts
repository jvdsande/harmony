import { GraphqlConfig } from '@foundationjs/typedefs/server'

// Need to use require because apollo-server-hapi exports are not recognized by TS
const { graphqlHapi, graphiqlHapi } = require('apollo-server-hapi')

export default async function (
  server: any,
  {
    graphql, graphiql, graphqlOptions, enableGraphiQL,
  }: GraphqlConfig,
) {
  // Create the GraphQL endpoint, using JWT as authentication
  await server.register({
    plugin: graphqlHapi,
    options: {
      path: graphql,
      route: {
        auth: {
          strategy: 'jwt',
          mode: 'try',
        },
        cors: true,
      },
      graphqlOptions,
    },
  })

  if (enableGraphiQL) {
    // Register GraphiQL endpoint for testing
    await server.register({
      plugin: graphiqlHapi,
      options: {
        path: graphiql,
        graphiqlOptions: {
          endpointURL: graphql,
        },
      },
    })
  }
}
