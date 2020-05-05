import { FastifyReply, FastifyRequest, RouteOptions } from 'fastify'
import { Config } from '@harmonyjs/apollo-fastify'

import { ILogger, LoggerConfig } from '@harmonyjs/logger'
import { Controller } from '@harmonyjs/types-server'
import { GraphQLScalarType } from 'graphql'

import { ModelResolvers } from 'resolver'
import {
  Model, SanitizedModel,
} from 'model'

import { IAdapter } from 'adapter'
import { IEvents } from './events'

export type Scalar = GraphQLScalarType & { mock?(): any }

export type PersistenceConfig<
  Models extends {[model: string]: Model} = any
> = {
  models: Models
  adapters: {[name: string]: IAdapter}
  scalars: {[name: string]: Scalar}
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
> = {
  configuration: PersistenceConfig<Models>
  logger: ILogger

  models: SanitizedModel[]

  events: IEvents
  context: PersistenceContext
  resolvers: {
    [model in keyof Models]: ModelResolvers<Models[model]>
  }

  controllers: {
    ControllerGraphQL: Controller<{
      path: string
      enablePlayground: boolean
      apolloConfig?: Omit<Config, 'schema'|'playground'|'introspection'|'mocks'|'mockEntireSchema'|'context'>
      routeConfig?: Omit<RouteOptions, 'auth'>
      authentication?: { validator: string } & Controller<any>
    }>
    ControllerEvents: Controller<void>
  }

  initialize(configuration: Partial<PersistenceConfig<Models>>): Promise<void>
  close(): Promise<void>
}
