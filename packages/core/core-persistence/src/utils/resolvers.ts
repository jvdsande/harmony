import {
  AliasedResolverEnum,
  ClassicResolverFunction, IAdapter, IProperty, IPropertySchema, ModelResolver, ReferenceResolverFunction,
  FieldResolver, QueryResolver,
  ResolverArgs, ResolverContext, ResolverEnum, ResolverFunction, ResolverInfo, ResolverResolvers, ResolverSource,
  SanitizedModel, Scope, Transform,
} from '@harmonyjs/types-persistence'

import GraphQLLong from 'graphql-type-long'
import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

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
  field, resolver, modelResolvers,
} : {
  field: string, resolver: FieldResolver|QueryResolver, modelResolvers: Record<string, ModelResolver>
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
      field,
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
          field,
        })
      })

    // Create queries
    Object.keys(model.resolvers.queries)
      .forEach((field) => {
        resolvers.Query[field] = computeFieldResolver({
          resolver: model.resolvers.queries[field],
          modelResolvers,
          field,
        })
      })

    // Create mutations
    Object.keys(model.resolvers.mutations)
      .forEach((field) => {
        resolvers.Mutation[field] = computeFieldResolver({
          resolver: model.resolvers.mutations[field],
          modelResolvers,
          field,
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
              field,
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

  resolvers.JSON = GraphQLJson
  resolvers.Date = GraphQLDate
  resolvers.Number = GraphQLLong

  return resolvers
}

function makeResolver({
  field, adapter, model, type, scope, transform,
} : {
  field: string, adapter?: IAdapter, model: SanitizedModel, type: ResolverEnum, scope?: Scope, transform?: Transform,
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

    let error
    let value
    let scopedArgs

    try {
      scopedArgs = ((scope && (await scope({
        args,
        context,
        source,
        info,
        field,
      }))) || args) as any

      value = await adapter[type]({
        source,
        args: scopedArgs,
        context,
        info: info || {} as ResolverInfo,
        model,
      })
    } catch (err) {
      error = err
    }

    try {
      if (transform) {
        return transform({
          field,
          source,
          args: scopedArgs,
          context,
          info: info || {} as ResolverInfo,
          value,
          error,
        })
      }
    } catch (err) {
      error = err
    }

    if (error) {
      throw error
    }

    return value
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
      scope: model.scopes[res.type] as Scope,
      transform: model.transforms[res.type] as Transform,
      field: extractModelType(model.name) + res.suffix,
    })

    resolvers[res.type].unscoped = makeResolver({
      type: res.type,
      adapter,
      model,
      field: extractModelType(model.name) + res.suffix,
    })

    if (res.alias) {
      res.alias.forEach((alias) => {
        resolvers[alias] = resolvers[res.type]
      })
    }
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
