import { FastifyRequest } from 'fastify'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'
import { Schema } from 'property'

import { UnscopedModelResolvers } from 'resolver'
import {
  Model, SanitizedModel,
} from 'model'

import { IAdapter } from 'adapter'
import { IEvents } from './events'

export type PersistenceConfig<
  Models extends {[model: string]: Model} = any
> = {
  models?: Models
  adapters?: {[name: string]: IAdapter}
  defaultAdapter?: string
  log?: LoggerConfig
  strict?: boolean
}

export type PersistenceInitializedConfig<
  Models extends {[model: string]: Model} = any,
  > = {
  models: Models
  adapters: {[name: string]: IAdapter}
  defaultAdapter?: string
  log: LoggerConfig
  strict: boolean
}

type PersistenceContextValue =
  string | number | boolean | null | { [key: string]: any } | any[]

export type PersistenceContext = {
  [key: string]: PersistenceContextValue | ((request: FastifyRequest) => any)
}

export type PersistenceInstance<
  Models extends {[model: string]: Model},
  Schemas extends { [key in keyof Models]: Schema } = { [key in keyof Models]: Models[key]['schema'] }
> = {
  configuration: PersistenceInitializedConfig<Models>
  logger: ILogger

  models: SanitizedModel[]
  events: IEvents
  context: PersistenceContext

  schema: string
  controllers: {
    ControllerGraphQL: Controller<{ path: string, enablePlayground: boolean }>
    ControllerEvents: Controller<void>
  }
  resolvers: {
    [model in keyof Schemas]: UnscopedModelResolvers<Schemas[model]>
  }
  initialize(configuration: PersistenceConfig<Models>): Promise<void>
  close(): Promise<void>
}
