import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify'
import { Config } from '@harmonyjs/apollo-fastify'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'
import { GraphQLScalarType } from 'graphql'
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
  scalars?: {[name: string]: GraphQLScalarType}
  defaultAdapter?: string
  log?: LoggerConfig
  strict?: boolean
}

export type PersistenceInitializedConfig<
  Models extends {[model: string]: Model} = any,
  > = {
  models: Models
  adapters: {[name: string]: IAdapter}
  scalars: {[name: string]: GraphQLScalarType}
  defaultAdapter: string
  log: LoggerConfig
  strict: boolean
}

type PersistenceContextValue =
  string | number | boolean | null | { [key: string]: any } | any[]

export type PersistenceContext = {
  [key: string]: PersistenceContextValue | ((args: { request: FastifyRequest, reply: FastifyReply<any> }) => any)
}

export type PersistenceInstance<
  Models extends {[model: string]: Model} = any,
  Schemas extends { [key in keyof Models]: Schema } = { [key in keyof Models]: Models[key]['schema'] }
> = {
  configuration: PersistenceInitializedConfig<Models>
  logger: ILogger

  models: SanitizedModel[]
  events: IEvents
  context: PersistenceContext

  schema: string
  controllers: {
    ControllerGraphQL: Controller<{
      path: string
      enablePlayground: boolean
      apolloConfig?: Omit<Config, 'schema'|'playground'|'introspection'|'mocks'|'mockEntireSchema'|'context'>
      routeConfig?: Omit<RouteOptions, 'auth'>
      authentication?: { validator: string }
    }>
    ControllerEvents: Controller<void>
  }
  resolvers: {
    [model in keyof Schemas]: UnscopedModelResolvers<Schemas[model]>
  }
  initialize(configuration: PersistenceConfig<Models>): Promise<void>
  close(): Promise<void>
}
