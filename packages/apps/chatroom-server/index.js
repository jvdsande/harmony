import Server, { ControllerSPA } from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'
import path from 'path'
import models from './models'

const server = new Server()
const persistence = new Persistence()

persistence.init({
  // Setup our data by injecting our imported models
  models,

  // Setup logging to go to the console. If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },

  // Setup the MongoDB endpoint
  endpoint: 'mongodb://127.0.0.1/chatroom',
})

server.init({
  // This is the configuration object of Harmony Server

  // Setup the main endpoint on which our application will be served
  endpoint: {
    host: 'localhost',
    port: 8888,
  },

  // Setup logging to go to the console. If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },

  // Give our persistence instance as a config parameter of our server to expose it
  persistence,

  graphql: {
    // Expose GraphQL on /graphql
    graphql: '/graphql',

    // Expose GraphiQL and enable it
    graphiql: '/graphiql',
    enableGraphiQL: true,

    // Inject the request's authentication context into our GraphQL resolvers
    graphqlOptions: async ({ auth }) => ({
      // You can inject any variable you could need into the GraphQL resolvers context. We will see later
      // how we can then use those variables to add custom behavior
      auth,
    }),
  },

  controllers: [
    new ControllerSPA({
      path: '/',
      forceStatic: false,

      statics: {
        dir: path.resolve(__dirname, '../chatroom-spa/public/'),
        path: '/',
      },

      hmr: {
        endpoint: 'localhost',
        port: 3000,
      },
    }),
  ],
})
