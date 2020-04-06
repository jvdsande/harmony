import Logger from '@harmonyjs/logger'
// Import helpers and types
import {
  TypedComputedField, TypedComputedQuery, IAdapter, PersistenceConfig, PersistenceInstance,
  Schema, SchemaField, ResolverEnum, Model,
} from '@harmonyjs/types-persistence'

import { configurePersistence } from 'steps/configuration'
import { importModels, initializeAdapters } from 'steps/entities'
import {
  defineControllers, defineResolvers, defineModelResolvers, defineSchema,
} from 'steps/launch'
import EventsHandler from 'utils/events'

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
  } = {
    adapters: {},
  }

  instance.initialize = async (
    configuration: PersistenceConfig<Models>,
  ) => {
    instance.configuration = configurePersistence({ config: configuration })
    instance.logger = Logger({ name: 'Persistence', configuration: instance.configuration.log })

    const { logger, configuration: config } = instance

    const {
      adapters, models, strict,
    } = config

    // Import models
    instance.models = await importModels({ models, logger, strict })

    // Initialize adapters
    await initializeAdapters({
      config, adapters, logger, models: instance.models, events,
    })
    local.adapters = adapters

    // Finish preparing instance
    instance.context = {}
    instance.schema = await defineSchema({ models: instance.models })
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
  // Used for extends fields, to calculate source and args
  CurrentModel extends Schema,

  // Context
  Context extends {[key: string]: any},

  // Used for resolvers
  Models extends {[model: string]: Model},

  // Args and return
  Return extends SchemaField,
  Args extends Schema = {},
>(f: TypedComputedField<
  CurrentModel,
  Context,
  Models,
  Args,
  Return
  >) {
  return f
}

export function query<
  // Used for extends fields, to calculate source and args
  CurrentModel extends Schema,

  // Context
  Context extends {[key: string]: any},

  // Used for resolvers
  Models extends {[model: string]: Model},

  // Extension
  Extension extends ResolverEnum,

  // Args and return
  Return extends SchemaField,
  Args extends Schema = {},
  >(f: TypedComputedQuery<
  CurrentModel,
  Context,
  Models,
  Extension,
  Args,
  Return
  >) {
  return f
}
