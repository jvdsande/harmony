import GraphQLLong from 'graphql-type-long'
import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import {
  Accessor, Events, Model, SanitizedModel, PersistenceConfig,
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
export { FieldMode } from '@harmonyjs/types-persistence'
export { default as Types } from './entities/schema-types'

export default class Persistence {
  config : PersistenceConfig = {
    models: [],
    accessors: {},
    strict: false,
  }

  sanitizedModels : SanitizedModel[] = []

  events = new Events()

  logger : Logger = new Logger('Persistence')

  // eslint-disable-next-line react/static-property-placement
  context : {[key: string]: any} = {}

  constructor(config : PersistenceConfig) {
    this.initializeProperties(config)

    this.createLogger()
  }

  async initialize() {
    const {
      accessors, models, strict, log,
    } = this.config

    const { logger } = this

    if (!this.config.defaultAccessor) {
      logger.warn(`No default accessor was specified. Will fallback to accessor '${
        Object.keys(accessors || { default: 'mock' })[0] || 'mock'
      }'`)
      this.config.defaultAccessor = Object.keys(accessors || { default: null })[0] || undefined
    }

    const { defaultAccessor } = this.config

    logger.info(`Accessors: [${Object.keys(accessors || {})}] - default: ${defaultAccessor || 'mock'}`)
    logger.info(`Initializing Persistence instance with ${models.length} models`)

    this.sanitizedModels = models
      .map((model) => sanitizeModel(model, strict))
      .map((model) => {
        logger.info(`Model '${model.name}' imported.`)
        return model
      })

    try {
      await Promise.all(
        Object.values(accessors || {})
          .map((accessor: Accessor) => {
            const accessorLogger = new Logger(accessor.name, log)
            accessorLogger.level = logger.level

            return accessor.initialize({
              models: this.sanitizedModels,
              events: this.events,
              logger: accessorLogger,
            })
          }),
      )
    } catch (err) {
      logger.error(err)
      throw new Error('An error occurred while initializing accessors')
    }
  }

  async init(config? : PersistenceConfig) {
    this.initializeProperties(config)

    this.createLogger()

    this.logger.warn(
      'Deprecation Notice: Persistence::init function is deprecated and will be removed in the next minor. '
      + 'Use Persistence::initialize instead.',
    )

    await this.initialize()
  }

  private initializeProperties(config ?: PersistenceConfig) {
    if (!config) {
      return
    }

    this.config.models = config.models || this.config.models
    this.config.accessors = config.accessors || this.config.accessors
    this.config.defaultAccessor = config.defaultAccessor || this.config.defaultAccessor
    this.config.strict = config.strict || this.config.strict
    this.config.log = config.log || this.config.log
  }

  private get schema() {
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

  resolvers : {
    [model: string]: {
      [query: string]: (args: any) => any,
    }
  } = {}

  private get internalResolvers() {
    const { accessors, defaultAccessor: defaultAccessorName } = this.config
    const models = this.sanitizedModels

    const resolvers: { [key: string]: any } = {}

    const localResolvers: { [key: string]: any } = {}

    const defaultAccessor = accessors ? accessors[defaultAccessorName || 'mock'] : undefined

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

    const wrappedResolvers : any = {}
    Object.keys(localResolvers).forEach((mod) => {
      wrappedResolvers[mod] = {}
      Object.keys(localResolvers[mod]).forEach((resolver) => {
        wrappedResolvers[mod][resolver] = (localArgs : any) => localResolvers[mod][resolver](null, localArgs, {}, {
          fieldNodes:
            [],
        })

        wrappedResolvers[mod][resolver].unscoped = (localArgs : any) => localResolvers[mod][resolver].unscoped(
          null,
          localArgs,
          {},
          { fieldNodes: [] },
        )
      })
    })

    this.resolvers = wrappedResolvers

    resolvers.Number = GraphQLLong
    resolvers.JSON = GraphQLJson
    resolvers.Date = GraphQLDate

    return resolvers
  }

  get controllers() {
    const {
      schema,
      internalResolvers,
      events,
      context,
    } = this

    const {
      defaultAccessor,
    } = this.config

    return ({
      ControllerGraphQL: class ControllerGraphQL extends ControllerApollo {
        name = 'ControllerGraphQL'

        constructor(config : {
          path: string, // The route on which to expose the GraphQL endpoint
          enablePlayground: boolean, // Whether to enable the GraphQL Playground page on the endpoint
        }) {
          super({
            ...config,
            context,
            schema,
            resolvers: internalResolvers,
            mock: !defaultAccessor,
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

  private createLogger() {
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
