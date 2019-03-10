import { GraphqlConfig } from '@harmonyjs/typedefs/server'
import { graphqlHapi, graphiqlHapi } from 'apollo-server-hapi'

// Import GraphQL so that Mixt knows to bundle it
import 'graphql'

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
