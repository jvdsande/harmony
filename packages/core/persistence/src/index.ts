import GraphQLLong from 'graphql-type-long'
import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import {
  Accessor, Events, Model, SanitizedModel,
} from '@harmonyjs/types-persistence'

import Logger from '@harmonyjs/logger'

// Import helpers and types
import { sanitizeModel } from './utils/model'
import {
  computeFieldResolvers,
  computeMainResolvers,
  computeReferenceResolvers,
} from './utils/resolvers'
import { ifWorker } from './utils/cluster'
import { printGraphqlRoot, printGraphqlQueries, printGraphqlMutations } from './utils/types'

// Export utility types and classes
export { default as Types } from './entities/schema-types'
export { FieldMode } from '@harmonyjs/types-persistence'

export default class Persistence {
  config : {
    models: Model[],
    accessors?: {[key: string]: Accessor},
    defaultAccessor?: string,
    log: any,
  } = {
    models: [],
    accessors: {},
    defaultAccessor: null,
    log: null,
  }

  sanitizedModels : SanitizedModel[] = []

  events = new Events()

  logger : Logger = null

  constructor(config) {
    this.initializeProperties(config)
  }

  initializeProperties(config) {
    if (!config) {
      return
    }

    this.config.models = config.models || this.config.models
    this.config.accessors = config.accessors || this.config.accessors
    this.config.defaultAccessor = config.defaultAccessor || this.config.defaultAccessor
  }

  async init(config) {
    this.initializeProperties(config)

    this.createLogger()

    const { accessors, models } = this.config
    const { logger } = this

    if (!this.config.defaultAccessor) {
      logger.warn(`No default accessor was specified. Will fallback to accessor '${
        Object.keys(accessors || { default: 'mock' })[0] || 'mock'
      }'`)
      this.config.defaultAccessor = Object.keys(accessors || { default: null })[0] || null
    }

    const { defaultAccessor } = this.config

    logger.info(`Accessors: [${Object.keys(accessors)}] - default: ${defaultAccessor || 'mock'}`)
    logger.info(`Initializing Persistence instance with ${models.length} models`)

    this.sanitizedModels = models
      .map(sanitizeModel)
      .map((model) => {
        logger.info(`Model '${model.name}' imported.`)
        return model
      })

    await Promise.all(
      Object.values(accessors || {})
        .map((accessor) => {
          const accessorLogger = new Logger(accessor.name)
          accessorLogger.level = logger.level

          return accessor.initialize({
            models: this.sanitizedModels,
            events: this.events,
            logger: accessorLogger,
          })
        }),
    )
  }

  get schema() {
    return `
scalar Date
scalar JSON
scalar Number
    
${this.sanitizedModels
    .map(printGraphqlRoot)
    .join('\n')}
    
${this.sanitizedModels
    .map(printGraphqlQueries)
    .join('\n')}
      
${this.sanitizedModels
    .map(printGraphqlMutations)
    .join('\n')}
    `
  }

  get resolvers() {
    const { accessors, defaultAccessor: defaultAccessorName } = this.config
    const models = this.sanitizedModels

    const resolvers: { [key: string]: any } = {}

    const localResolvers: { [key: string]: any } = {}

    const defaultAccessor = accessors[defaultAccessorName]

    resolvers.Query = {}
    resolvers.Mutation = {}

    if (defaultAccessor) {
      computeMainResolvers({
        models,
        accessors,
        defaultAccessor,
        resolvers,
        localResolvers,
      })

      computeReferenceResolvers({
        models,
        accessors,
        defaultAccessor,
        resolvers,
      })

      computeFieldResolvers({
        models,
        resolvers,
        localResolvers,
      })
    }

    resolvers.Number = GraphQLLong
    resolvers.JSON = GraphQLJson
    resolvers.Date = GraphQLDate

    return resolvers
  }

  get controllers() {
    const {
      schema,
      resolvers,
      events,
    } = this

    const {
      defaultAccessor,
    } = this.config

    return ({
      ControllerGraphQL: class ControllerGraphQL extends ControllerApollo {
        name = 'ControllerGraphQL'

        constructor(config) {
          super({
            ...config,
            schema,
            resolvers,
            mock: defaultAccessor == null,
          })
        }
      },
      ControllerEvents: class ControllerEvents extends ControllerPersistenceEvents {
        name = 'ControllerEvents'

        constructor() {
          super({
            events,
          })
        }
      },
    })
  }

  createLogger() {
    const { log } = this.config
    const logConfig = log || {}

    // Append worker id to forks' filename
    ifWorker((worker) => {
      logConfig.filename = logConfig.filename && `[${worker.id}]_${(logConfig.filename)}`

      if (worker.id > 1) {
        logConfig.level = 'error'
      }
    })

    // Prepare the logger
    this.logger = new Logger('Persistence', logConfig)
  }
}
