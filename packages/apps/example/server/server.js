// @flow

import path from 'path'

import Server, { ControllerSPA } from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import models from './persistence/models'

const server = new Server()
const persistence = new Persistence({
  models,
})

persistence.connect({
  endpoint: 'mongodb://127.0.0.1/harmony-example',
})

server.init({
  endpoint: {
    host: '127.0.0.1',
    port: 8082,
  },

  authentication: {
    secret: 'secret-key',
  },

  persistence,

  graphql: {
    graphql: '/graphql/{path*}',
    graphiql: '/graphiql/{path*}',
    enableGraphiQL: true,
    graphqlOptions(schema) {
      return async ({ auth }) => ({
        schema,
        context: {
          auth,
        },
      })
    },
  },

  controllers: [
    new ControllerSPA({
      path: '/',
      forceStatic: false,

      statics: {
        dir: path.resolve(__dirname, '../build/'),
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
