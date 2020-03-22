import {
  AliasedResolverEnum,
  ClassicResolverFunction, IAdapter, IProperty, IPropertySchema, ModelResolver, ReferenceResolverFunction, Resolver,
  ResolverArgs, ResolverContext, ResolverEnum, ResolverFunction, ResolverInfo, ResolverResolvers, ResolverSource,
  SanitizedModel, Scope,
} from '@harmonyjs/types-persistence'

import { extractModelType } from 'utils/property/utils'

export type ResolverDefinition = {
  type: ResolverEnum,
  suffix: string,
  alias?: AliasedResolverEnum[],
}

// Query
export const queryResolvers: ResolverDefinition[] = [
  {
    type: 'read',
    suffix: '',
    alias: ['get'],
  }, {
    type: 'readMany',
    suffix: 'List',
    alias: ['list'],
  }, {
    type: 'count',
    suffix: 'Count',
  },
]

// Mutations
export const mutationResolvers: ResolverDefinition[] = [
  {
    type: 'create',
    suffix: 'Create',
  }, {
    type: 'createMany',
    suffix: 'CreateMany',
  }, {
    type: 'update',
    suffix: 'Update',
    alias: ['edit'],
  }, {
    type: 'updateMany',
    suffix: 'UpdateMany',
    alias: ['editMany'],
  }, {
    type: 'delete',
    suffix: 'Delete',
  }, {
    type: 'deleteMany',
    suffix: 'DeleteMany',
  },
]

function computeFieldResolver({
  resolver, modelResolvers,
} : {
  resolver: Resolver, modelResolvers: Record<string, ModelResolver>
}) {
  return (
    source: ResolverSource,
    args: ResolverArgs,
    context: ResolverContext,
    info: ResolverInfo,
  ) => {
    const wrappedResolvers : ResolverResolvers = {}

    Object.keys(modelResolvers)
      .forEach((mod) => {
        const modelResolver = modelResolvers[mod]

        Object.keys(modelResolver)
          .forEach((res) => {
            const alias = res as AliasedResolverEnum

            wrappedResolvers[mod] = wrappedResolvers[mod] || {}

            const wrappedResolver = (nArgs : ResolverArgs) => modelResolver[alias]({
              args: nArgs,
              source,
              info,
              context,
            })
            wrappedResolver.unscoped = (nArgs : ResolverArgs) => modelResolver[alias].unscoped({
              args: nArgs,
              source,
              info,
              context,
            })

            wrappedResolvers[mod][alias] = wrappedResolver
          })
      })

    return resolver({
      source,
      args,
      context,
      info,
      resolvers: wrappedResolvers,
    })
  }
}

export function getResolvers({
  modelResolvers, models,
} : {
  modelResolvers: Record<string, ModelResolver>, models: SanitizedModel[]
}) {
  const resolvers: { [key: string]: any } = {}

  resolvers.Query = {}
  resolvers.Mutation = {}

  Object.keys(modelResolvers)
    .forEach((model) => {
      const baseName = model[0].toLowerCase() + model.slice(1)

      const harmonyModel = models.find((m) => m.schemas.main.graphqlName === model)
      if (!harmonyModel || harmonyModel.external) {
        return
      }

      queryResolvers.forEach((res) => {
        resolvers.Query[baseName + res.suffix] = (
          source: ResolverSource,
          args: ResolverArgs,
          context: ResolverContext,
          info: ResolverInfo,
        ) => modelResolvers[model][res.type]({
          source, args, context, info,
        })
      })
      mutationResolvers.forEach((res) => {
        resolvers.Mutation[baseName + res.suffix] = (
          source: ResolverSource,
          args: ResolverArgs,
          context: ResolverContext,
          info: ResolverInfo,
        ) => modelResolvers[model][res.type]({
          source, args, context, info,
        })
      })
    })

  // Find reference fields
  function extractReference(field : IProperty) {
    if (field.type === 'reference') {
      // Handle reference
      const isArray = field.parent && field.parent.type === 'array'
      const fieldName = (isArray ? (field.parent && field.parent.name) : field.name) || ''
      const baseName = (isArray
        ? field.parent && field.parent.parent && field.parent.parent.graphqlName
        : field.parent && field.parent.graphqlName
      ) || ''
      const model = extractModelType(field.of)

      resolvers[baseName] = resolvers[baseName] || {}
      const resolver = isArray ? modelResolvers[model].references : modelResolvers[model].reference

      resolvers[baseName][fieldName] = (
        source: ResolverSource,
        args: ResolverArgs,
        context: ResolverContext,
        info: ResolverInfo,
      ) => resolver({
        source, context, info, fieldName, foreignFieldName: '_id',
      })
    }
    if (field.type === 'reversed-reference') {
      // Handle reversed reference
      const isArray = field.parent && field.parent.type === 'array'
      const fieldName = (isArray ? (field.parent && field.parent.name) : field.name) || ''
      const baseName = (isArray
        ? field.parent && field.parent.parent && field.parent.parent.graphqlName
        : field.parent && field.parent.graphqlName
      ) || ''
      const model = extractModelType(field.of)

      if (!modelResolvers[model]) {
        throw new Error(`No model found for name ${model}`)
      }

      resolvers[baseName] = resolvers[baseName] || {}
      const resolver = isArray ? modelResolvers[model].references : modelResolvers[model].reference

      resolvers[baseName][fieldName] = (
        source: ResolverSource,
        args: ResolverArgs,
        context: ResolverContext,
        info: ResolverInfo,
      ) => resolver({
        source, context, info, foreignFieldName: field.on, fieldName: '_id',
      })
    }
    if (field.type === 'schema') {
      // eslint-disable-next-line no-use-before-define
      extractReferences(field)
    }
    if (field.type === 'array') {
      extractReference(field.deepOf)
    }
  }

  function extractReferences(schema : IPropertySchema) {
    Object.keys(schema.of)
      .forEach((field) => {
        extractReference(schema.of[field])
      })
  }

  models.forEach((model) => {
    // Create references resolvers from main schema
    extractReferences(model.schemas.main)

    // Create references resolvers from computed schema
    extractReferences(model.schemas.computed)

    // Create resolvers from computed fields
    Object.keys(model.resolvers.computed)
      .forEach((field) => {
        const baseName = extractModelType(model.name)

        resolvers[baseName] = resolvers[baseName] || {}
        resolvers[baseName][field] = computeFieldResolver({
          resolver: model.resolvers.computed[field],
          modelResolvers,
        })
      })

    // Create queries
    Object.keys(model.resolvers.queries)
      .forEach((field) => {
        resolvers.Query[field] = computeFieldResolver({
          resolver: model.resolvers.queries[field],
          modelResolvers,
        })
      })

    // Create mutations
    Object.keys(model.resolvers.mutations)
      .forEach((field) => {
        resolvers.Mutation[field] = computeFieldResolver({
          resolver: model.resolvers.mutations[field],
          modelResolvers,
        })
      })

    // Create custom resolvers
    Object.keys(model.resolvers.custom)
      .forEach((baseName) => {
        resolvers[baseName] = resolvers[baseName] || {}
        Object.keys(model.resolvers.custom[baseName])
          .forEach((field) => {
            resolvers[baseName][field] = computeFieldResolver({
              resolver: model.resolvers.custom[baseName][field],
              modelResolvers,
            })
          })
      })

    // Create federation resolver
    if (!model.external) {
      resolvers[extractModelType(model.name)] = resolvers[extractModelType(model.name)] || {}
      resolvers[extractModelType(model.name)].__resolveReference = (reference: { _id: string }) => (
        modelResolvers[extractModelType(model.name)].read({
          args: {
            filter: {
              _id: reference._id,
            },
          },
        })
      )
    }
  })

  return resolvers
}

function makeResolver({
  adapter, model, type, scope,
} : {
  adapter?: IAdapter, model: SanitizedModel, type: ResolverEnum, scope?: Scope,
}) : ClassicResolverFunction {
  if (!adapter) {
    return () => null
  }

  return async ({
    source, args, context, info,
  } : {
    source?: ResolverSource,
    args?: ResolverArgs,
    context?: ResolverContext,
    info?: ResolverInfo,
  }) => {
    if (!adapter) {
      return () => null
    }

    return adapter[type]({
      source,
      args: ((scope && (await scope({ args, context }))) || args) as any,
      context,
      info: info || {} as ResolverInfo,
      model,
    })
  }
}

function makeReferenceResolver({
  adapter, model, type,
} : {
  adapter?: IAdapter, model: SanitizedModel, type: 'resolveRef'|'resolveRefs', scope?: Function
}) : ReferenceResolverFunction {
  if (!adapter) {
    return () => null
  }

  return ({
    source, fieldName, foreignFieldName, context, info,
  } : {
    fieldName: string,
    foreignFieldName: string,
    source?: ResolverSource,
    context?: ResolverContext,
    info?: ResolverInfo,
  }) => {
    if (model.external) {
      if (foreignFieldName !== '_id') {
        throw new Error('Reversed References cannot be used on an external schema!')
      }

      // In case of an external Federation model, return a Representation
      return {
        resolveRef: () => {
          const element = source && source[fieldName]
          const _id = (element && element._id) ? element._id : element

          return ({
            __typename: model.schemas.main.graphqlName,
            _id,
          })
        },
        resolveRefs: () => source
          && source[fieldName]
          && Array.isArray(source[fieldName])
          && source[fieldName].map((element: { _id: string }) => {
            const _id = (element && element._id) ? element._id : element

            return ({
              __typename: model.schemas.main.graphqlName,
              _id,
            })
          }),
      }[type]()
    }

    if (!adapter) {
      return null
    }

    return adapter[type]({
      fieldName,
      foreignFieldName,
      source,
      context,
      info: info || {} as ResolverInfo,
      model,
    })
  }
}

export function makeResolvers({ adapter, model } : { adapter?: IAdapter, model: SanitizedModel }) {
  const resolvers : Record<string, ResolverFunction&{unscoped?:ResolverFunction}> = {}

  const rootResolvers = [...queryResolvers, ...mutationResolvers]

  rootResolvers.forEach((res) => {
    resolvers[res.type] = makeResolver({
      type: res.type,
      adapter,
      model,
      scope: model.scopes[res.type],
    })

    resolvers[res.type].unscoped = makeResolver({
      type: res.type,
      adapter,
      model,
    })

    res.alias?.forEach((alias) => {
      resolvers[alias] = resolvers[res.type]
    })
  })

  resolvers.reference = makeReferenceResolver({
    type: 'resolveRef',
    adapter,
    model,
  })

  resolvers.references = makeReferenceResolver({
    type: 'resolveRefs',
    adapter,
    model,
  })

  return resolvers as ModelResolver
}
