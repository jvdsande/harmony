// @flow

import path from 'path'

import Server from '@foundationjs/server'
import Persistence from '@foundationjs/persistence'

import ControllerGatsby from '@foundationjs/controller-gatsby'
import ControllerSPA from '@foundationjs/server/dist/plugins/spa'

import models from './persistence/models'

const server = new Server()
const persistence = new Persistence({
  models,
})

persistence.connect({
  endpoint: 'mongodb://127.0.0.1/dazzled-framework-example',
})

server.init({
  addresses: {
    endpoint: {
      host: '127.0.0.1',
      port: 8082,
    },

    webpack: {
      host: '127.0.0.1',
      port: 8090,
      path: '/webpack',
    },
  },

  authentication: {
    secret: 'secret-key',
  },

  web: {
    views: {
      dir: path.resolve(__dirname, './views'),
      paths: {
        '/gatsby/todo/{path*}': 'index.jsx',
      },
    },
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
    new ControllerGatsby({
      path: '/gatsby',
      forceStatic: true,

      dir: path.resolve(__dirname, './gatsby/public'),
      dynamicRoutes: {
        '/dynamic/{path*}': 'dynamic',
      },

      hmr: {
        endpoint: 'localhost',
        port: 7777,
      },
    }),

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
