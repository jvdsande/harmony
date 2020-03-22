import ControllerApollo from '@harmonyjs/controller-apollo'
import ControllerPersistenceEvents from '@harmonyjs/controller-persistence-events'

import {
  SanitizedModel, PersistenceInstance, IAdapter, ModelResolver,
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

export async function defineResolvers({
  models, adapters, defaultAdapterName,
} : {
  models: SanitizedModel[], adapters: {[key:string]: IAdapter}, defaultAdapterName?: string
}) {
  const resolvers: Record<string, ModelResolver> = {}

  const defaultAdapter = adapters ? adapters[defaultAdapterName || 'mock'] : undefined

  models.forEach((model) => {
    const name = model.schemas.main.graphqlName

    resolvers[name] = makeResolvers({
      adapter: model.adapter ? adapters[model.adapter] : defaultAdapter,
      model,
    })
  })

  return resolvers
}

export async function defineControllers({ instance } : { instance: PersistenceInstance }) {
  function ControllerGraphQL({ path, enablePlayground } : { path: string, enablePlayground: boolean }) {
    return ({
      ...(ControllerApollo({
        path,
        enablePlayground,
        context: instance.context,
        schema: instance.schema,
        resolvers: getResolvers({ modelResolvers: instance.resolvers, models: instance.models }),
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
