import { PersistenceConfig, PersistenceInitializedConfig } from '@harmonyjs/types-persistence'

// eslint-disable-next-line import/prefer-default-export
export function configurePersistence({
  config,
} : {
  config: PersistenceConfig
}) : PersistenceInitializedConfig {
  const configuration = config
  configuration.models = config.models || {}
  configuration.adapters = config.adapters || {}
  configuration.scalars = config.scalars || {}
  configuration.log = config.log || {}
  configuration.strict = !!config.strict

  return configuration as PersistenceInitializedConfig
}
