import Logger from '@harmonyjs/logger'
// Import helpers and types
import { IAdapter, PersistenceConfig, PersistenceInstance } from '@harmonyjs/types-persistence'

import { configurePersistence } from 'steps/configuration'
import { importModels, initializeAdapters } from 'steps/entities'
import {
  defineControllers, defineResolvers, defineSchema,
} from 'steps/launch'
import EventsHandler from 'utils/events'

// Export utility types and classes
export { default as Types } from 'utils/types'
export {
  PersistenceConfig, PersistenceInstance, Adapter, IAdapter,
  Model, Schema, Computed, Scopes, PropertyMode,
} from '@harmonyjs/types-persistence'

export default function Persistence() {
  // Create an instance
  const events = EventsHandler()
  const instance : Partial<PersistenceInstance> = {
    events,
  }

  const local : {
    adapters : Record<string, IAdapter>
  } = {
    adapters: {},
  }

  instance.initialize = async (configuration: Partial<PersistenceConfig>) => {
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
    instance.resolvers = await defineResolvers({
      models: instance.models,
      adapters,
      defaultAdapterName: configuration.defaultAdapter,
    })
    instance.controllers = await defineControllers({ instance: instance as PersistenceInstance })
  }

  instance.close = async () => {
    await events.close()
    await Promise.all(Object.values(local.adapters).map(async (adapter) => {
      await adapter.close()
    }))
  }

  return instance as PersistenceInstance
}
