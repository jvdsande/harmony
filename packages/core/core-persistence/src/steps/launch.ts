import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import {
  SanitizedModel, PersistenceInstance, IAdapter, InternalResolvers, AliasedResolverEnum,
  UnscopedModelResolvers, Model,
} from '@harmonyjs/types-persistence'
import { GraphQLScalarType } from 'graphql'

import { printSchema } from 'utils/model'
import {
  makeResolvers, getResolvers,
} from 'utils/resolvers'

export async function defineSchema({ models, scalars } : { models: SanitizedModel[], scalars: string[] }) {
  return `# Harmony Scalars
scalar Date
scalar JSON
scalar Number

# Custom Scalars
${scalars.map((s) => `scalar ${s}`).join('\n')}
    
# Types
${models.map((model) => printSchema({ model })).join('\n')}`
}

export async function defineResolvers<Models extends string|number|symbol>({
  models, adapters, defaultAdapterName,
} : {
  models: SanitizedModel[]
  adapters: {[key:string]: IAdapter}
  defaultAdapterName?: string
}) {
  const resolvers: Record<Models, InternalResolvers> = {} as any

  const defaultAdapter = adapters ? adapters[defaultAdapterName || 'mock'] : undefined

  models.forEach((model) => {
    const name = model.schemas.main.graphqlName as Models

    resolvers[name] = makeResolvers({
      adapter: model.adapter ? adapters[model.adapter] : defaultAdapter,
      model,
    })
  })

  return resolvers
}

export async function defineModelResolvers<Models extends {[model: string]: Model}>({
  internalResolvers,
} : {
  internalResolvers: Record<string, InternalResolvers>
}) {
  const modelResolvers : Record<keyof Models, UnscopedModelResolvers> = {} as any

  Object.keys(internalResolvers)
    .forEach((model) => {
      const internalResolver : InternalResolvers = internalResolvers[model]
      modelResolvers[model as keyof Models] = {} as any
      Object.keys(internalResolver)
        .forEach((res) => {
          modelResolvers[model as keyof Models][res as AliasedResolverEnum] = (args: { [key: string]: any }) => (
            internalResolver[res as AliasedResolverEnum].unscoped({ args })
          )
        })
    })

  return modelResolvers
}

export async function defineControllers({
  instance, internalResolvers, scalars,
} : {
  instance: PersistenceInstance<any>,
  internalResolvers: Record<string, InternalResolvers>,
  scalars: Record<string, GraphQLScalarType>
}) {
  function ControllerGraphQL({
    path,
    enablePlayground,
    routeConfig,
    apolloConfig,
    authentication,
  } : Parameters<PersistenceInstance<any>['controllers']['ControllerGraphQL']>[0]) {
    return ({
      ...(ControllerApollo({
        path,
        enablePlayground,
        context: instance.context,
        schema: instance.schema,
        resolvers: getResolvers({ internalResolvers, models: instance.models, scalars }),
        mock: !instance.configuration.defaultAdapter,
        authentication,
        routeConfig,
        apolloConfig,
      })),
      name: 'ControllerGraphQL',
    })
  }

  function ControllerEvents() {
    return ({
      ...(ControllerPersistenceEvents({
        events: instance.events,
      })),
      name: 'ControllerEvents',
    })
  }

  return ({
    ControllerGraphQL,
    ControllerEvents,
  })
}
