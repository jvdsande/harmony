import path from 'path'

import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import AccessorMongoose from '@harmonyjs/accessor-mongoose'
import ControllerSPA from '@harmonyjs/controller-spa'

import models from './models'

const persistence = new Persistence()


persistence.init({
  // Setup our data by injecting the imported models
  models,

  accessors: {
    mongo: new AccessorMongoose({
      host: 'mongodb://localhost:27017/',
      database: 'chatroom',
    }),
  },

  // Setup logging to go to the console.
  // If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },
})

const server = new Server()

const { ControllerGraphQL, ControllerEvents } = persistence.controllers

server.init({
  // This is the configuration object of Harmony Server

  // Setup the main endpoint on which our application will be served
  endpoint: {
    host: 'localhost',
    port: 8888,
  },

  controllers: [
    new ControllerGraphQL({
      path: '/graphql',
      enablePlayground: true,
    }),
    new ControllerEvents(),
    new ControllerSPA({
      // Serve our SPA on '/'
      path: '/',
      // Use development mode by default
      forceStatic: false,

      // Our static files are located in the 'public' folder of the 'chatroom-spa' package
      statics: {
        dir: path.resolve(__dirname, '../chatroom-spa/public/'),
        path: '/',
      },

      // In development, we need to proxy our request to the Hot-Module-Replacement server
      // launched by create-react-app, on port 3000
      hmr: {
        endpoint: 'localhost',
        port: 3000,
      },
    }),
  ],


  // Setup logging to go to the console.
  // If this is not provided, all logging will go into a .log file at the root
  log: {
    console: true,
  },
})
