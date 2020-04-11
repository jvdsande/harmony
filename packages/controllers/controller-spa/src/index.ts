import { FastifyInstance } from 'fastify'
import httpProxy from 'http-proxy'

import FastifyStatic from 'fastify-static'
import FastifyHttpProxy from 'fastify-http-proxy'

import { ILogger } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'

type SPAView = {
  path: string,
  dir: string,
  file: string,
}

type SPAWebpack = {
  active: boolean,
  endpoint: string,
  port: number,
}

type ControllerSPAConfig = {
  path: string,
  dir: string,
  views?: SPAView[]
  webpack?: SPAWebpack,
}

let sockjsProxied = false

async function serveStaticFiles({
  server, path, dir, webpack, logger,
} : {
  server: FastifyInstance,
  path: string,
  dir: string,
  webpack?: SPAWebpack,
  logger: ILogger,
}) {
  // In development, we can use options.hmr.active = false to run in production-like mode
  const production = process.env.NODE_ENV === 'production' || !webpack || !webpack.active

  logger.info(`Initializing SPA Controller on path ${path} (Environment: ${
    process.env.NODE_ENV || 'development'
  }, Mode: ${
    production ? 'static' : 'webpack'
  })`)

  let staticPath = path

  if (!staticPath.endsWith('/')) {
    staticPath += '/'
  }

  // Route for serving static files
  await server.register(FastifyStatic, {
    root: dir,
    prefix: staticPath,
    serve: production,
  })

  if (production) {
    logger.info(`Serving static files from ${dir} on path ${staticPath}`)
  } else if (webpack) {
    const upstream = [webpack.endpoint, webpack.port].filter((s) => s).join(':')
    // Webpack Proxy
    server.register(FastifyHttpProxy, {
      prefix: staticPath,
      rewritePrefix: staticPath,
      upstream,
      http2: false,
    })

    // We also need to proxy sockjs-node, since Webpack development uses the standard sockjs path
    // This means that any other sockjs used for Harmony need to be on a different path
    if (!sockjsProxied) {
      sockjsProxied = true
      server.register(FastifyHttpProxy, {
        prefix: '/sockjs-node',
        upstream,
        http2: false,
      })

      // Finally, we proxy the upgrade request if they start by /socket.io
      const wsProxy = httpProxy.createProxyServer({ target: upstream })
      wsProxy.on('error', (error: any) => logger.error(error))

      server.server.on('upgrade', (req, socket, head) => {
        if (req.url.startsWith('/sockjs-node')) wsProxy.ws(req, socket, head)
      })
    }

    logger.info(`Webpack proxy established to address ${upstream}`)
  }

  logger.info(`SPA site served on ${path}`)
}

async function serveViewsCatchAll({ server, logger, views } : {
  server: FastifyInstance,
  logger: ILogger,
  views?: SPAView[],
}) {
  if (views) {
    views.forEach((view) => {
      const basePath = view.path.endsWith('/') ? view.path : `${view.path}/`
      const mainPath = basePath.length > 1 ? basePath.slice(0, -1) : basePath
      const path = basePath.endsWith('*') ? basePath : `${basePath}*`

      server.get(mainPath, (request, reply) => {
        reply.sendFile(view.file, view.dir)
      })
      server.get(path, (request, reply) => {
        reply.sendFile(view.file, view.dir)
      })

      logger.info(`Serving ${`${view.dir}/${view.file}`} for route ${path}`)
    })
  }
}

/*
 * The SPA Controller exposes a single-page app on a given path,
 * statically built using Webpack, or served by Webpack-Dev-Server in development
 */
const ControllerSPA : Controller<ControllerSPAConfig> = function ControllerSPA(config) {
  return ({
    name: 'ControllerSPA',
    async initialize({ logger, server }) {
      const {
        path,
        dir,
        webpack,
        views,
      } = config

      await serveStaticFiles({
        server,
        logger,
        path,
        dir,
        webpack,
      })

      await serveViewsCatchAll({
        server,
        logger,
        views,
      })
    },
  })
}

export default ControllerSPA
