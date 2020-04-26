import Logger from '@harmonyjs/logger'
// Import helpers and types
import {
  TypedComputedField, TypedComputedQuery, IAdapter, PersistenceInstance,
  Schema, SchemaField, CrudEnum, Model, PersistenceContext,
} from '@harmonyjs/types-persistence'

import { configurePersistence } from 'steps/configuration'
import { importModels, initializeAdapters } from 'steps/entities'
import {
  defineControllers, defineResolvers, defineModelResolvers, defineSchema,
} from 'steps/launch'
import EventsHandler from 'utils/events'
import { typeIdsAndReferences } from 'utils/model'
import Types from 'utils/types'

// Export utility types and classes
export { default as Types } from 'utils/types'
export {
  // Needed to type a Persistence instance
  PersistenceConfig, PersistenceInstance,

  // Needed to type adapters
  Adapter, IAdapter,

  // Needed to type a Model instance
  Model,
  Schema, Computed, Scopes, Transforms,

  // Needed to type a ComputedField or ComputedQuery instance
  Scope, Transform, Resolver, PropertyMode,

  // Useful helpers
  SchemaOutputType, SchemaInputType,
} from '@harmonyjs/types-persistence'

export default function Persistence<
  Models extends {[key in string]: Model} = any,
>() {
  const events = EventsHandler()

  const local : {
    adapters : Record<string, IAdapter>
    internalContext : PersistenceContext
  } = {
    adapters: {},
    internalContext: {},
  }

  const internal : {
    -readonly [T in keyof PersistenceInstance<Models>]?: PersistenceInstance<Models>[T]
  } = {
    events,
  }

  const getInternalField = <F extends keyof PersistenceInstance<Models>>(f: F) : PersistenceInstance<Models>[F] => {
    if (internal[f]) {
      return internal[f] as PersistenceInstance<Models>[F]
    }

    throw new Error('You must call PersistenceInstance::initialize before accessing any other field!')
  }

  // Create an instance
  const instance : PersistenceInstance<Models> = {
    get configuration() {
      return getInternalField('configuration')
    },
    get logger() {
      return getInternalField('logger')
    },
    get models() {
      return getInternalField('models')
    },
    get events() {
      return getInternalField('events')
    },
    get context() {
      return getInternalField('context')
    },
    get resolvers() {
      return getInternalField('resolvers')
    },
    get controllers() {
      return getInternalField('controllers')
    },

    async initialize(configuration) {
      internal.configuration = configurePersistence({ config: configuration })
      internal.logger = Logger({ name: 'Persistence', configuration: internal.configuration.log })

      const { logger, configuration: config } = internal

      if (!config.defaultAdapter) {
        logger.warn(`No default adapter was specified. Will fallback to adapter '${
          Object.keys(config.adapters || { mock: null })[0] || 'mock'
        }'`)
        // eslint-disable-next-line no-param-reassign
        config.defaultAdapter = Object.keys(config.adapters)[0] || 'mock'
      }

      const {
        scalars, adapters, models, strict, defaultAdapter,
      } = config

      // Import models
      internal.models = await importModels({
        models, logger, strict, defaultAdapter,
      })

      await typeIdsAndReferences({ models: internal.models })

      // Initialize adapters
      await initializeAdapters({
        config, adapters, logger, models: internal.models, events, scalars,
      })
      local.adapters = adapters

      // Finish preparing instance
      internal.context = {}
      const schema = await defineSchema({
        models: internal.models,
        scalars: Object.keys(scalars),
      })
      const internalResolvers = await defineResolvers({
        models: internal.models,
        adapters,
        defaultAdapterName: configuration.defaultAdapter,
      })
      internal.resolvers = await defineModelResolvers<Models>({
        internalResolvers,
      })
      internal.controllers = await defineControllers({
        schema,
        internalResolvers,
        internalContext: local.internalContext,
        scalars,
        instance,
      })
    },

    async close() {
      await events.close()
      await Promise.all(Object.values(local.adapters).map(async (adapter) => {
        await adapter.close()
      }))
    },
  }
  return instance
}


export function field<
  // Context
  Context extends {[key: string]: any},

  // Used for resolvers
  Schemas extends {[model: string]: Schema},

  // Used for extends fields, to calculate source and args
  CurrentSchema extends Schema,

  // Args and return
  Return extends SchemaField,
  Args extends Schema = {},
>(f: TypedComputedField<
  Context,
  Schemas,
  CurrentSchema,
  Args,
  Return
  >) {
  return f
}

export function query<
  // Context
  Context extends {[key: string]: any},

  // Used for resolvers
  Schemas extends {[model: string]: Schema},

  // Used for extends fields, to calculate source and args
  CurrentSchema extends Schema,

  // Extension
  Extension extends CrudEnum,

  // Args and return
  Return extends SchemaField,
  Args extends Schema = {},
  >(f: TypedComputedQuery<
  Context,
  Schemas,
  CurrentSchema,
  Extension,
  Args,
  Return
  >) {
  return f
}


function shallowMerge(...obj : object[]) {
  const prototype : any = {}
  const descriptors : any = {}

  obj.forEach((o) => {
    const p = Object.getPrototypeOf(o)
    Object.keys(p).forEach((pk) => {
      prototype[pk] = p[pk]
    })
    const d = Object.getOwnPropertyDescriptors(o)
    Object.keys(d).forEach((dk) => {
      descriptors[dk] = d[dk]
    })
  })

  return Object.create(
    prototype,
    descriptors,
  )
}

export function extendTypes<T extends object>(types : T) {
  return shallowMerge(Types, types) as typeof Types & T
}
