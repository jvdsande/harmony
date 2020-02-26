import { ILogger, LoggerConfig } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'
import { ModelResolver } from 'resolvers'

import {
  IAdapter, IEvents, Model, SanitizedModel,
} from './index'

export type PersistenceConfig = {
  models: Model[],
  adapters: {[key: string]: IAdapter},
  defaultAdapter?: string,
  log: LoggerConfig,
  strict: boolean,
}

export type PersistenceInstance = {
  configuration: PersistenceConfig,
  logger: ILogger,

  models: SanitizedModel[],
  events: IEvents,
  context: {
    [key: string]: any,
  },

  schema: string,
  controllers: {
    ControllerGraphQL: Controller<{ path: string, enablePlayground: boolean }>,
    ControllerEvents: Controller<void>,
  },
  resolvers: Record<string, ModelResolver>, // TODO create "Resolver" type

  initialize: (configuration: Partial<PersistenceConfig>) => Promise<void>,
}
