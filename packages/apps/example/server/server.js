import path from 'path'

// Require Harmony
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

// Require Controllers fro Server
import ControllerSPA from '@harmonyjs/controller-spa'

// Require Accessors for Persistence
import MongooseAccessor from '@harmonyjs/accessor-mongoose'

// Load models
import models from './persistence/models'

// Create a Server and a Persistence instance
const server = new Server()
const persistence = new Persistence()

// Configure persistence with our models, and add a Mongoose Accessor for storing and reading data
persistence.init({
  models,
  accessors: {
    mongo: new MongooseAccessor({
      host: 'mongodb://localhost:27017/',
      database: 'harmony-example',
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
    ControllerGraphQL({
      path: '/graphql',
      enablePlayground: true,
    }),

    // Forwarding the Persistence events on SocketIO
    ControllerEvents(),

    // Exposing an SPA from static files (production) or by proxying Webpack (development), using
    // Hapi Views
    ControllerSPA({
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
