// @flow

import Inert from 'inert'
import H2O2 from 'h2o2'
import Vision from 'vision'

import HapiReactViews from 'hapi-react-views'

import Logger from '@foundationjs/logger'

import type { ServerController, ControllerSPAConfiguration } from '@foundationjs/flowtypes/server'

const logger : Logger = new Logger('SPAController')

/*
 * The SPA Controller exposes a single-page app on a given path,
 * statically built using Webpack, or served by Webpack-Dev-Server in development
 */
const ControllerSPA = function (options : ControllerSPAConfiguration) : ServerController {
  const {
    path,
    forceStatic,
    hmr,

    statics,
    views,
  } = options

  async function initialize(server) {
    // The SPA Controller is made of two parts: a static serving system for resources,
    // and a view system for rendering the initial page(s)

    // In development, we can use options.forceStatic to run in production-like mode
    const production = process.env.NODE_ENV === 'production' || forceStatic

    logger.info(`Initializing SPA Controller on path ${options.path} (Environment: ${
      process.env.NODE_ENV || 'development'
    }, Mode: ${
      production ? 'static' : 'webpack'
    })`)

    if (views) {
      /* Configure view engine to use React */
      server.views({
        engines: { jsx: HapiReactViews, js: HapiReactViews, ...views.engines },
        path: views.dir,
        defaultExtension: 'js',
      })

      /* Register view routes */
      if (views.paths) {
        Object.keys(views.paths).forEach((p) => {
          const view = views.paths[p]

          const viewPath = path + (path.endsWith('/') ? '' : '/') + (p.startsWith('/') ? p.slice(1) : p)

          server.route({
            method: 'GET',
            path: viewPath,
            handler: { view },
          })

          logger.info(`Registered view '${view}' on path ${viewPath}`)
        })
      } else if (logger) {
        logger.warn('View Engine initialized with no views')
      }
    }

    let staticPath = path
      + ((path.endsWith('/')) ? '' : '/')
      + (statics.path.startsWith('/') ? statics.path.slice(1) : statics.path)

    if (staticPath.endsWith('/')) {
      staticPath = staticPath.slice(0, -1)
    }


    if (production) {
      /* Route for serving static files */
      server.route({
        method: 'GET',
        path: `${path}${statics.path}/{param*}`,
        handler: {
          directory: {
            path: staticPath,
          },
        },
      })

      logger.info(`Serving static files from ${statics.dir} on path ${staticPath}/`)
    } else {
      /* Webpack Proxy */
      server.route({
        method: 'GET',
        path: `${staticPath}/{webpackPath*}`,
        handler: {
          proxy: {
            host: hmr.endpoint,
            port: hmr.port,
            passThrough: true,
          },
        },
      })

      logger.info(`Webpack proxy established to address ${hmr.endpoint}:${hmr.port}`)
    }

    logger.info(`SPA site served on ${options.path}`)
  }

  return {
    initialize,
    plugins: [
      Vision,
      Inert,
      H2O2,
    ],
  }
}

export default ControllerSPA
