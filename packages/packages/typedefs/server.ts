import { LogConfig, LoggerClass } from './logger'

// Address
export type Address = {
  host: string,
  port?: number,
  autoListen?: boolean,
}

type EndpointConfig = Address

export type HMRAddress = {
  host: string,
  port?: number,
  path: string,
}

export type AddressesConfig = { // Deprecated
  endpoint: Address,
  webpack: HMRAddress,
}

// Persistence
export type PersistenceConfig = {
  schema: Object,
  configureIO: Function,
}

// Cluster
export type ClusterConfig = {
  sticky?: {
    size: number,
    header?: string,
    proxy?: boolean,
  },
  redis?: {
    host: string,
    port: number,
  },
}

// Authentication Controller
export type AuthenticationConfig = {
  secret: string,
  validate?: () => Promise<boolean>
}

// Web Controller
export type WebConfig = {
  views?: {
    dir: string,
    paths: {
      [key: string]: string,
    },
    engines?: {
      [key: string]: Object,
    },
  },
  static?: {
    dir: string,
    path: string,
    enabled?: boolean,
  },
  routes?: Array<Object>,
  logger?: LoggerClass,
}

// GraphQL Controller
export type GraphqlConfig = {
  graphql: string,
  graphiql?: string,
  schema?: Object,
  graphqlOptions: Function,
  enableGraphiQL?: boolean,
}

// External Controllers
export type ServerController = {
  initialize: (Object) => Promise<void>,
  plugins: Array<any>,
}

export type ControllerSPAConfiguration = {
  path: string,
  forceStatic?: boolean,
  hmr: {
    endpoint: string,
    port: number,
  },
  statics: {
    dir: string,
    path: string,
  },
  views?: {
    dir: string,
    paths: {
      [key: string]: string,
    },
    engines?: {
      [key: string]: Object
    },
  },
}

// Configuration
export type ServerConfiguration = {
  addresses: AddressesConfig, // Deprecated
  endpoint: EndpointConfig,
  persistence?: PersistenceConfig,
  cluster?: ClusterConfig,
  authentication?: AuthenticationConfig,
  web: WebConfig,
  graphql?: GraphqlConfig,
  log?: LogConfig,
  controllers?: Array<ServerController>
}
