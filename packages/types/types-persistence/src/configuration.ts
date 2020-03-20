import { FastifyRequest } from 'fastify'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'

import { ModelResolver } from 'resolvers'

import {
  IAdapter, IEvents, Model, SanitizedModel,
} from './index'

export type PersistenceConfig = {
  models: Model[]
  adapters: {[key: string]: IAdapter}
  defaultAdapter?: string
  log: LoggerConfig
  strict: boolean
}

type PersistenceContextValue =
  string | number | boolean | null | { [key: string]: any } | any[]

export type PersistenceContext = {
  [key: string]: PersistenceContextValue | ((request: FastifyRequest) => any)
}

export type PersistenceInstance = {
  configuration: PersistenceConfig
  logger: ILogger

  models: SanitizedModel[]
  events: IEvents
  context: PersistenceContext

  schema: string
  controllers: {
    ControllerGraphQL: Controller<{ path: string, enablePlayground: boolean }>
    ControllerEvents: Controller<void>
  }
  resolvers: Record<string, ModelResolver>

  initialize(configuration: Partial<PersistenceConfig>): Promise<void>
  close(): Promise<void>
}
