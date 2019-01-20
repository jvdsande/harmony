// @flow

import Inert from 'inert'
import H2O2 from 'h2o2'
import httpProxy from 'http-proxy'

import fs from 'fs'
import path from 'path'

import Logger from '@foundationjs/logger'

import type { ServerController } from '@foundationjs/flowtypes/server'
import type { ControllerGatsbyConfiguration } from './types'

const logger : Logger = new Logger('GatsbyController')

// Only the first instance will be functional in development
let nbInstance = 0

const GatsbyController = function (options : ControllerGatsbyConfiguration) : ServerController {
  async function initialize(server) {
    // Gatsby needs two things to for a start: a static folder serving, and a proxy for development mode
    // In development, we can use options.forceStatic to run in production-like mode
    const production = process.env.NODE_ENV === 'production' || options.forceStatic

    // Then we create the route handler gor Gatsby
    logger.info(`Initializing Gatsby Controller on path ${options.path} (Environment: ${
      process.env.NODE_ENV || 'development'
    }, Mode: ${
      production ? 'static' : 'webpack'
    })`)

    const handler = {}

    if (!production) {
      // In development, we establish the proxy
      handler.proxy = {
        uri: `http://${options.hmr.endpoint}:${options.hmr.port}/{gatsbyPath}`,
        passThrough: true,
      }

      if (!nbInstance) {
        // We need to proxy commons.js if we want Gatsby to be functional
        server.route({
          method: 'GET',
          path: '/commons.js',
          handler: {
            proxy: {
              host: options.hmr.endpoint,
              port: options.hmr.port,
              passThrough: true,
            },
          },
        })

        // We also need to proxy socket.io, since Gatsby development uses the standard socket.io path
        // This means that any other socket.io used for Dazzled need to be on a different path
        server.route({
          method: ['POST', 'GET'],
          path: '/socket.io/{path*}',
          handler: {
            proxy: {
              host: options.hmr.endpoint,
              port: options.hmr.port,
              passThrough: true,
            },
          },
        })

        // Finally, we proxy the upgrade request is they start by /socket.io
        const wsProxy = httpProxy.createProxyServer({ target: `http://${options.hmr.endpoint}:${options.hmr.port}` })
        wsProxy.on('error', error => logger.error(error))

        server.listener.on('upgrade', (req, socket, head) => {
          if (req.url.startsWith('/socket.io')) wsProxy.ws(req, socket, head)
        })
      } else {
        logger.warn(
          'Multiple instances of Gatsby Controller have been found. '
          + 'Only the first one will work in development out-of-the-box!',
        )
        logger.warn(
          `To use this Gatsby instance in development, edit ${options.dir}/index.html`
          + ` and append '${options.path}' in front of '/commons.js'`,
        )
      }


      logger.info(`Gatsby development mode listening on ${options.hmr.endpoint}:${options.hmr.port}`)
      logger.info(`To run Gatsby, use the following command:
  GATSBY_WEBPACK_PUBLICPATH=http://${options.hmr.endpoint}:${options.hmr.port}/`
        + ` gatsby develop -p ${options.hmr.port} --prefix-paths`)
      logger.info(`Don't forget to add this line to your gatsby-config.js file:
  pathPrefix: '${options.path}'`)
    } else {
      // In production, we create the static serving
      handler.directory = {
        path: options.dir,
      }

      // We also create redirect for dynamic routes, if any
      if (options.dynamicRoutes) {
        const { dynamicRoutes } = options

        Object.keys(dynamicRoutes).forEach((route) => {
          const routeHandler = function (req, h) {
            const filepath = req.url.pathname.split(options.path)[1]

            if (fs.existsSync(path.resolve(options.dir, `./${filepath}.html`))) {
              return h.file(path.resolve(options.dir, `./${filepath}.html`))
            }

            if (fs.existsSync(path.resolve(options.dir, `./${filepath}`, './index.html'))) {
              return h.file(path.resolve(options.dir, `./${filepath}`, './index.html'))
            }

            return h.file(`${options.dir}/${dynamicRoutes[route]}/index.html`)
          }

          server.route({
            method: 'GET',
            path: options.path + route,
            handler: routeHandler,
          })

          logger.info(`Added dynamic route for path ${route} -> ${dynamicRoutes[route]}`)
        })
      }
    }

    nbInstance += 1

    const mainPath = options.path + (options.path.endsWith('/') ? '{gatsbyPath*}' : '/{gatsbyPath*}')

    // Then we create the route
    server.route({
      method: '*',
      path: mainPath,
      handler,
    })

    server.route({
      method: ['POST', 'GET'],
      path: mainPath,
      handler,
    })

    logger.info(`Gatsby static site served on ${options.path} (${options.dir})`)
  }

  return {
    initialize,
    plugins: [
      Inert,
      H2O2,
    ],
  }
}

export default GatsbyController
