import Logger from '@harmonyjs/logger'
// Import helpers and types
import {
  TypedComputedField, TypedComputedQuery, IAdapter, PersistenceConfig, PersistenceInstance,
  Schema, SchemaField, ResolverEnum, Model, PersistenceContext,
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
  PersistenceConfig, PersistenceInstance, Adapter, IAdapter,
  Model, Schema, Computed, Scopes, Transforms, PropertyMode,
  Scope, Transform,
  SchemaOutputType, SchemaInputType,
} from '@harmonyjs/types-persistence'

export default function Persistence<
  Models extends {[key in string]: Model} = any,
>() {
  // Create an instance
  const events = EventsHandler()
  const instance : Partial<PersistenceInstance<Models>> = {
    events,
  }

  const local : {
    adapters : Record<string, IAdapter>
    internalContext : PersistenceContext
  } = {
    adapters: {},
    internalContext: {},
  }

  instance.initialize = async (
    configuration: PersistenceConfig<Models>,
  ) => {
    instance.configuration = configurePersistence({ config: configuration })
    instance.logger = Logger({ name: 'Persistence', configuration: instance.configuration.log })

    const { logger, configuration: config } = instance

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
    instance.models = await importModels({
      models, logger, strict, defaultAdapter,
    })

    await typeIdsAndReferences({ models: instance.models })

    // Initialize adapters
    await initializeAdapters({
      config, adapters, logger, models: instance.models, events, scalars,
    })
    local.adapters = adapters

    // Finish preparing instance
    instance.context = {}
    instance.schema = await defineSchema({
      models: instance.models,
      scalars: Object.keys(scalars),
    })
    const internalResolvers = await defineResolvers({
      models: instance.models,
      adapters,
      defaultAdapterName: configuration.defaultAdapter,
    })
    instance.resolvers = await defineModelResolvers<Models>({
      internalResolvers,
    })
    instance.controllers = await defineControllers({
      internalResolvers,
      internalContext: local.internalContext,
      scalars,
      instance: instance as PersistenceInstance<Models>,
    })
  }

  instance.close = async () => {
    await events.close()
    await Promise.all(Object.values(local.adapters).map(async (adapter) => {
      await adapter.close()
    }))
  }

  return instance as PersistenceInstance<Models>
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
  Extension extends ResolverEnum,

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
