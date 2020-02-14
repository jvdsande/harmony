import path from 'path'

// Require Harmony
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

// Require Controllers fro Server
import ControllerSPA from '@harmonyjs/controller-spa'

// Require Accessors for Persistence
import AccessorMongoose from '@harmonyjs/accessor-mongoose'
import AccessorMongoosePluginElasticSerach from '@harmonyjs/accessor-mongoose-plugin-elasticsearch'

// Load models
import models from './persistence/models'

// Create a Server and a Persistence instance
const server = new Server()
const persistence = new Persistence()

// Configure persistence with our models, and add a Mongoose Accessor for storing and reading data
persistence.init({
  models,
  accessors: {
    mongo: new AccessorMongoose({
      host: 'mongodb://mongo:27017/',
      database: 'harmony-example',
      plugins: [
        new AccessorMongoosePluginElasticSerach({
          host: 'localhost',
          port: 9200,
          prefix: 'development',
        }),
      ],
    }),
  },
  defaultAccessor: 'mongo',
})

// Extract our Persistence instance's controllers
const { ControllerGraphQL, ControllerEvents } = persistence.controllers

// Configure our server and launch it
server.init({
  // On localhost:3000
  endpoint: {
    host: 'localhost',
    port: 3000,
  },

  controllers: [
    // Exposing the GraphQL schema on /graphql
    new ControllerGraphQL({
      path: '/graphql',
      enablePlayground: true,
    }),

    // Forwarding the Persistence events on SocketIO
    new ControllerEvents(),

    // Exposing an SPA from static files (production) or by proxying Webpack (development), using
    // Hapi Views
    new ControllerSPA({
      path: '/',

      statics: {
        dir: path.resolve(__dirname, '../chatroom-spa/public/'),
        path: '/public',
      },

      views: {
        dir: path.resolve(__dirname, './views'),
        paths: {
          '/{path*}': 'index.jsx',
        },
      },

      hmr: {
        endpoint: 'localhost',
        port: 8090,
      },
    }),
  ],
})
