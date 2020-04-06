import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import {
  SanitizedModel, PersistenceInstance, IAdapter, InternalResolvers, AliasedResolverEnum,
  UnscopedModelResolvers, Model,
} from '@harmonyjs/types-persistence'

import { printSchema } from 'utils/model'
import {
  makeResolvers, getResolvers,
} from 'utils/resolvers'

export async function defineSchema({ models } : { models: SanitizedModel[] }) {
  return `# Scalars
scalar Date
scalar JSON
scalar Number
    
# Types
${models.map((model) => printSchema({ model })).join('\n')}`
}

export async function defineResolvers<Models extends string|number|symbol>({
  models, adapters, defaultAdapterName,
} : {
  models: SanitizedModel[], adapters: {[key:string]: IAdapter}, defaultAdapterName?: string
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
  instance, internalResolvers,
} : {
  instance: PersistenceInstance<any>, internalResolvers: Record<string, InternalResolvers>
}) {
  function ControllerGraphQL({ path, enablePlayground } : { path: string, enablePlayground: boolean }) {
    return ({
      ...(ControllerApollo({
        path,
        enablePlayground,
        context: instance.context,
        schema: instance.schema,
        resolvers: getResolvers({ internalResolvers, models: instance.models }),
        mock: !instance.configuration.defaultAdapter,
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
