// @ts-ignore
import path from 'path'

// Require Harmony
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

// Require Controllers fro Server
import ControllerSPA from '@harmonyjs/controller-spa'

// Require Adapters for Persistence
import AdapterMongoose from '@harmonyjs/adapter-mongoose'

// Load models
import models from './persistence/models'

// Create a Server and a Persistence instance
const persistence = Persistence<typeof models>()
const server = Server()

async function run() {
  // Configure persistence with our models, and add a Mongoose Adapter for storing and reading data
  await persistence.initialize({
    models,
    adapters: {
      mongo: AdapterMongoose({
        host: 'mongodb://localhost:27017/',
        database: 'harmony-todolist',
      }),
    },
    defaultAdapter: 'mongo',
  })

  // Extract our Persistence instance's controllers
  const { ControllerGraphQL, ControllerEvents } = persistence.controllers

  // Configure our server and launch it
  await server.initialize({
    // On localhost:3000
    endpoint: {
      host: '0.0.0.0',
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

      // Exposing an SPA from static files (production) or by proxying Webpack (development)
      ControllerSPA({
        path: '/public',
        dir: path.resolve(__dirname, '../public/'),

        views: [{
          path: '/',
          dir: path.resolve(__dirname, './views/'),
          file: 'index.html',
        }, {
          path: '/test',
          dir: path.resolve(__dirname, './views/'),
          file: 'test.html',
        }],

        webpack: {
          active: true,
          endpoint: 'http://localhost',
          port: 8090,
        },
      }),
    ],
  })
}

run()
