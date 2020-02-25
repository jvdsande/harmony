import Logger from '@harmonyjs/logger'
// Import helpers and types
import { PersistenceConfig, PersistenceInstance } from '@harmonyjs/types-persistence'

import { configurePersistence } from 'steps/configuration'
import { importModels, initializeAdapters } from 'steps/entities'
import {
  defineControllers, defineResolvers, defineSchema,
} from 'steps/launch'
import EventsHandler from 'utils/events'

// Export utility types and classes
export { default as Types } from 'utils/types'
export {
  PropertyMode, Model, Computed, Scopes, Schema,
} from '@harmonyjs/types-persistence'

export default function Persistence(deprecatedConfig: Partial<PersistenceConfig>) {
  // Create an instance
  const instance : Partial<PersistenceInstance> = {
    events: EventsHandler(),
  }

  instance.initialize = async (configuration: Partial<PersistenceConfig>) => {
    instance.configuration = configurePersistence({ config: configuration })
    instance.logger = Logger({ name: 'Persistence', configuration: instance.configuration.log })

    const { logger, configuration: config } = instance

    if (deprecatedConfig) {
      instance.logger.warn(
        '[Deprecation Notice] Passing configuration in the constructor is deprecated and will be removed in the '
        + 'next minor. Pass the configuration to Persistence::initialize instead',
      )
    }

    const {
      adapters, models, strict,
    } = config

    // Import models
    instance.models = await importModels({ models, logger, strict })

    // Initialize adapters
    await initializeAdapters({
      config, adapters, logger, models: instance.models, events: instance.events!,
    })

    // Finish preparing instance
    instance.schema = await defineSchema({ models: instance.models })
    instance.resolvers = await defineResolvers({
      models: instance.models,
      adapters,
      defaultAdapterName: configuration.defaultAdapter,
    })
    instance.controllers = await defineControllers({ instance: instance as PersistenceInstance })
  }


  // @deprecated
  instance.init = async (initConfig?: Partial<PersistenceConfig>) => {
    await instance.initialize!(initConfig || deprecatedConfig || {})

    instance.logger!.warn(
      '[Deprecation Notice] Persistence::init is deprecated and will be removed in the next minor. '
      + 'Use Persistence::initialize instead.',
    )
  }

  return instance as PersistenceInstance
}
