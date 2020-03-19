import { ServerConfig } from '@harmonyjs/types-server'

// eslint-disable-next-line import/prefer-default-export
export function configureServer({ config } : { config: Partial<ServerConfig> }) : ServerConfig {
  const configuration = config
  configuration.endpoint = config.endpoint || { host: 'localhost', port: 3000 }
  configuration.controllers = config.controllers || []
  configuration.log = config.log || {}
  configuration.authentication = config.authentication || { secret: 'harmony' }
  configuration.socket = config.socket || { path: '/harmonyjs-socket' }

  return configuration as ServerConfig
}
