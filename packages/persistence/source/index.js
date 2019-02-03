// @flow

import Cluster from 'cluster'

import Mongoose from 'mongoose'
import Mexp from 'mongoose-elasticsearch-xp'
import { schemaComposer } from 'graphql-compose'
import Logger from '@foundationjs/logger'
import type { Model, PersistenceConfiguration } from '@foundationjs/flowtypes/persistence'

import createComposer, { getComposerName } from './composer'

Mongoose.Promise = global.Promise

function composerName(model : Model) {
  return getComposerName(model)
}

function modelName(name) {
  return name.replace(/^([a-z])/, (f, l) => l.toUpperCase())
}

/**
 * Return a list of pre-configured composers
 * @param {object} composers - Map of composers
 * @param {object} context - Request context
 * @returns {object} - Map of context-injected composers
 */
function scopeComposers(composers, context) {
  const scopedComposers = {}

  const queryResolvers = [
    'get', 'list', 'count',
  ]

  const recordResolvers = [
    'create', 'update',
  ]

  const recordsResolvers = [
    'createMany',
  ]

  const idResolvers = [
    'delete',
  ]

  Object.keys(composers).forEach((key) => {
    const composer = composers[key]
    scopedComposers[key] = {
      model: composers[key].model,
    }

    queryResolvers.forEach((rs) => {
      scopedComposers[key][rs] = (filter, { skip, sort, limit } = {}) => composer[rs].resolve({
        args: {
          filter,
          skip,
          sort,
          limit,
        },
        context,
      })
      scopedComposers[key][rs].unscoped = (filter, { skip, sort, limit } = {}) => composer[rs].unscoped.resolve({
        args: {
          filter,
          skip,
          sort,
          limit,
        },
        context,
      })
    })

    recordResolvers.forEach((rs) => {
      scopedComposers[key][rs] = record => composer[rs].resolve({ args: { record }, context })
      scopedComposers[key][rs].unscoped = record => composer[rs].unscoped.resolve({ args: { record }, context })
    })

    recordsResolvers.forEach((rs) => {
      scopedComposers[key][rs] = records => composer[rs].resolve({ args: { records }, context })
      scopedComposers[key][rs].unscoped = records => composer[rs].unscoped.resolve({ args: { records }, context })
    })

    idResolvers.forEach((rs) => {
      scopedComposers[key][rs] = _id => composer[rs].resolve({ args: { _id }, context })
      scopedComposers[key][rs].unscoped = _id => composer[rs].unscoped.resolve({ args: { _id }, context })
    })
  })

  return scopedComposers
}

/**
 * Add a field to a composer, with scoped request
 * @param {string} field - Name of the field to add
 * @param {string} kind - Whether it's a field, a query or a mutation
 * @param {*} to - Composer to add the field to
 * @param {*} composers - Map of composers to inject
 */
function addField(field, kind, to, composers) {
  const config = kind[field]
  to.addFields({
    [field]: {
      projection: config.needs || config.projection,
      type: config.type || (config.extends ? config.extends.type : undefined),
      args: config.args || (config.extends ? config.extends.args : undefined),
      resolve: async (source, args, context, info) => config.resolve({
        source,
        args,
        context,
        info,
        composers: scopeComposers(composers, context),
      }),
    },
  })
}

function makeEsExtend(fields) {
  const esFields = {}

  Object.keys(fields).forEach((f) => {
    const field = fields[f]

    esFields[f] = {
      es_value: field.value || field.es_value,
      es_type: field.type || field.es_type,
    }
  })

  return esFields
}

export const Types = {
  ...Mongoose.Schema.Types,
  Map: Mongoose.Schema.Types.Mixed,
}

/**
 * Class Persistence: initialize a Persistence configuration for a Foundation App.
 */
export default class Persistence {
  logger : Logger

  schema : Object

  io : Object

  typeComposers : Object

  Mutation : Object

  Query : Object

  /**
   * Constructor
   * @param {PersistenceConfiguration} config - Optional config object
   */
  constructor(config: ?PersistenceConfiguration) {
    if (config) {
      this.init(config)
    }
  }

  /**
   * Function configuring the Persistence instance
   * @param {models} models - List of models to store
   * @param {query} query - Optional object to configure additional queries
   * @param {mutation} mutation - Optional object to configure additional mutations
   * @param {log} log - Optional object to configure the logger
   * @param {endpoint} endpoint - Optional object to configure the endpoint for Mongo
   * @param {object} elasticsearch - Optional object to configure ElasticSearch bridge
   * @returns {boolean} - Successful initialization
   */
  async init({
    models: modelsConfig,
    query,
    mutation,
    log,
    endpoint,
    elasticsearch,
  } : PersistenceConfiguration) {
    // Prepare the logger
    const logConfig = log || {}

    if (!Cluster.isMaster) {
      logConfig.filename = logConfig.filename && `[${Cluster.worker.id}]_${(logConfig.filename)}`
    }

    // Prepare the logger
    this.logger = new Logger('Persistence', logConfig)

    const { logger } = this

    if (!Cluster.isMaster) {
      logger.info(`Cluster Mode! Instance ${Cluster.worker.id} running`)
      logger.level = 'error'
    }

    logger.info('Initializing Persistence')

    const scopes = {}
    const models = {}
    const refMap = {}

    if (!modelsConfig.length) {
      logger.error('Cannot initialize Persistence without any model!')
      return false
    }

    logger.info(`Found ${modelsConfig.length} models. Importing...`)

    modelsConfig.forEach((model) => {
      scopes[composerName(model)] = model.scope
      refMap[model.name] = model

      let params

      if (model.elasticsearch && model.elasticsearch.fields) {
        params = {
          es_extend: makeEsExtend(model.elasticsearch.fields),
        }
      }

      const schema = new Mongoose.Schema(model.schema, params)
      const name = modelName(model.name)

      schema.post('save', (doc) => {
        logger.debug(`${name} updated`)

        if (model.onPostSave) {
          model.onPostSave(doc)
        }

        if (this.io) {
          this.io.to('updates').emit(`${name.toLowerCase()}-updated`, doc._id)
          this.io.to('updates').emit(`${name.toLowerCase()}-saved`, doc._id)
        }
      })
      schema.post('remove', (doc) => {
        logger.debug(`${name} updated`)

        if (model.onPostRemove) {
          model.onPostRemove(doc)
        }

        if (this.io) {
          this.io.to('updates').emit(`${name.toLowerCase()}-updated`, doc._id)
          this.io.to('updates').emit(`${name.toLowerCase()}-removed`, doc._id)
        }
      })

      if (model.elasticsearch) {
        // Get the list of path to populate
        const paths = []
        if (model.elasticsearch.fields) {
          Object.values(model.elasticsearch.fields).forEach((field) => {
            if (field.es_populate) {
              paths.push(...Object.entries(field.es_populate).filter(p => p[1]).map(([path]) => path))
            }
          })
        }

        schema.post('save', async (doc, next) => {
          if (paths.length) {
            let exec = doc
            paths.forEach((path) => {
              exec = exec.populate(path)
            })

            await doc.execPopulate()
          }
          next()
        })

        const mexpParams = { hydrate: true }

        if (elasticsearch) {
          if (elasticsearch.host) {
            mexpParams.host = elasticsearch.host
          }
          if (elasticsearch.auth) {
            mexpParams.auth = elasticsearch.auth
          }
          if (elasticsearch.port) {
            mexpParams.port = elasticsearch.port
          }
          if (elasticsearch.protocol) {
            mexpParams.protocol = elasticsearch.protocol
          }

          if (elasticsearch.prefix) {
            mexpParams.index = `${elasticsearch.prefix}_${name}`.toLowerCase()
            mexpParams.type = `${elasticsearch.prefix}_${name}`.toLowerCase()
          }
        }

        schema.plugin(Mexp, mexpParams)
      }

      models[name] = Mongoose.model(model.name, schema, model.collection) // Force the collection name if provided
      models[name].composer = model.composer

      logger.info(`Model '${name}' imported.`)
    })

    const scopeAccessResolver = composers => (resolver, name, type) => resolver.wrapResolve(next => async ({
      source, args, context, info,
    }) => {
      if (!scopes[name] || !(scopes[name] instanceof Function)) {
        return next({
          source, args, context, info,
        })
      }

      const newArgs = (await scopes[name]({
        source,
        args,
        context,
        info,
        models, // Deprecated
        composers: scopeComposers(composers, context),
        type,
      })) || args

      return next({
        source, args: newArgs, context, info,
      })
    })

    const composers = createComposer({
      schemaComposer,
      models,
      scopeAccessResolver,
      refMap,
    })

    if (query) {
      logger.info('Importing custom Query...')
      query({
        schemaComposer,
        composers,
        scopeAccessResolver: scopeAccessResolver(composers),
        models,
      })
      logger.info('Imported.')
    }
    if (mutation) {
      logger.info('Importing custom Mutation...')
      mutation({
        schemaComposer,
        composers,
        scopeAccessResolver: scopeAccessResolver(composers),
        models,
      })
      logger.info('Imported.')
    }

    const typeComposers = {}

    Object.keys(composers).forEach((comp) => {
      typeComposers[comp] = composers[comp] // Deprecated
      typeComposers[`${comp}TC`] = composers[comp]
    })

    this.typeComposers = typeComposers
    this.Query = schemaComposer.Query
    this.Mutation = schemaComposer.Mutation

    logger.info('Adding custom fields to models...')
    modelsConfig.forEach((model) => {
      const { fields } = model

      if (fields) {
        const fieldsConfig = fields({
          schemaComposer, // Deprecated
          composers, // Deprecated
          scopeAccessResolver: scopeAccessResolver(composers), // Deprecated
          models, // Deprecated

          typeComposers,
        })

        if (fieldsConfig) {
          if (fieldsConfig.fields) {
            Object.keys(fieldsConfig.fields)
              .forEach(
                field => addField(field, fieldsConfig.fields, composers[composerName(model)], composers),
              )
          }

          if (fieldsConfig.queries) {
            Object.keys(fieldsConfig.queries)
              .forEach(field => addField(field, fieldsConfig.queries, schemaComposer.Query, composers))
          }

          if (fieldsConfig.mutations) {
            Object.keys(fieldsConfig.mutations)
              .forEach(field => addField(field, fieldsConfig.mutations, schemaComposer.Mutation, composers))
          }
        }
      }
    })
    logger.info('Done.')

    logger.info('Building GraphQL schema...')
    this.schema = schemaComposer.buildSchema()
    logger.info('GraphQL schema available.')

    if (endpoint) {
      return this.connect({ endpoint })
    }

    return true
  }

  async connect({ endpoint } : { endpoint: string }) {
    return new Promise((resolve, reject) => {
      const { logger } = this

      logger.info(`Connecting to Mongo at ${endpoint}.`)
      Mongoose.connect(
        endpoint,
        {
          useNewUrlParser: true,
        },
        () => {
          logger.info('Mongo connected.')
          resolve(true)
        },
        (error) => {
          reject(error)
        },
      )
    })
  }

  configureIO = ({ io } : { io: Object }) => {
    const { logger } = this

    logger.info('New Socket.IO service available. Connecting...')
    this.io = io

    io.on('connection', (socket) => {
      socket.join('updates')
    })

    logger.info('Socket.IO connected.')
  }
}
