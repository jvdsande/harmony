import { PersistenceConfig } from '@harmonyjs/types-persistence'

// eslint-disable-next-line import/prefer-default-export
export function configurePersistence({ config } : { config: Partial<PersistenceConfig> }) : PersistenceConfig {
  const configuration = config
  configuration.models = config.models || []
  configuration.adapters = config.adapters || {}
  configuration.log = config.log || {}
  configuration.strict = !!config.strict

  return configuration as PersistenceConfig
}
