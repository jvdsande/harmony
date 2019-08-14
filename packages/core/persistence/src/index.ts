import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import Logger from '@harmonyjs/logger'

// Import helpers and types
import SchemaModel, { NestedProperty } from './entities/schema-model'
import Accessor from './entities/accessor'
import { sanitizeModel } from './utils/model'
import Events from './entities/events'
import {
  computeFieldResolvers,
  computeMainResolvers,
  computeReferenceResolvers,
} from './utils/resolvers'

// Export utility types and classes
export { default as Types, SchemaType } from './entities/schema-types'
export { default as Accessor } from './entities/accessor'
export { FieldMode, SchemaEntry } from './entities/model'

const logger = new Logger('Persistence')

export default class Persistence {
  models = []

  accessors : {[key: string]: Accessor}= {}

  defaultAccessor = null

  schemaModels : SchemaModel[] = []

  events = new Events()

  constructor(config) {
    this.initializeProperties(config)
  }

  initializeProperties(config) {
    if (!config) {
      return
    }

    this.models = config.models || this.models
    this.accessors = config.accessors || this.accessors
    this.defaultAccessor = config.defaultAccessor || this.defaultAccessor
  }

  async init(config) {
    this.initializeProperties(config)

    if (!this.defaultAccessor) {
      logger.warn(`No default accessor was specified. Will fallback to accessor '${
        Object.keys(this.accessors || { default: 'mock' })[0]
      }"`)
      this.defaultAccessor = Object.keys(this.accessors || { default: null })[0]
    }

    logger.info(`Initializing Persistence instance with ${this.models.length} models`)
    logger.info(`Accessors: [${Object.keys(this.accessors)}] - default: ${this.defaultAccessor}`)

    this.schemaModels = this.models
      .map(sanitizeModel)
      .map((model) => new SchemaModel(model))

    await Promise.all(
      Object.values(this.accessors || {})
        .map((accessor) => {
          const accessorLogger = new Logger(accessor.name)
          accessorLogger.level = logger.level

          return accessor.initialize({
            models: this.models,
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
    
${this.schemaModels
    .map((schemaModel) => schemaModel.types)
    .join('\n')}`
  }

  get resolvers() {
    const resolvers: { [key: string]: any } = {}

    const localResolvers: { [key: string]: any } = {}

    const defaultAccessor = this.accessors[this.defaultAccessor]

    resolvers.Query = {}
    resolvers.Mutation = {}

    if (defaultAccessor) {
      computeMainResolvers({
        models: this.models,
        accessors: this.accessors,
        defaultAccessor,
        resolvers,
        localResolvers,
      })

      computeReferenceResolvers({
        models: this.models,
        accessors: this.accessors,
        schemaModels: this.schemaModels,
        defaultAccessor,
        resolvers,
      })

      computeFieldResolvers({
        models: this.models,
        resolvers,
        localResolvers,
      })
    }

    resolvers.JSON = GraphQLJson
    resolvers.Date = GraphQLDate

    return resolvers
  }

  get controllers() {
    const {
      schema,
      resolvers,
      events,
      defaultAccessor,
    } = this

    return ({
      ControllerGraphQL: class ControllerGraphQL extends ControllerApollo {
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
        constructor() {
          super({
            events,
          })
        }
      },
    })
  }
}
