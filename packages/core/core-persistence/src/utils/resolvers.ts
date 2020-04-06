import {
  AliasedResolverEnum, ResolverEnum,
  InternalResolvers,
  ScopedInternalResolver, UnscopedInternalResolver, InternalResolver, Resolver, ReferenceResolver, Scope, Transform,
  IAdapter, IProperty, IPropertySchema,
  SanitizedModel, ModelResolvers,
} from '@harmonyjs/types-persistence'
import { ApolloError, ValidationError } from 'apollo-server-core'
import { GraphQLResolveInfo } from 'graphql'

import GraphQLLong from 'graphql-type-long'
import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

import { extractModelName } from 'utils/property/utils'

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

type ResolverSource = any
type ResolverArgs = {[key: string]: any}
type ResolverContext = {[key: string]: any}
type ResolverInfo = GraphQLResolveInfo

function computeFieldResolver({
  field, resolver, internalResolvers,
} : {
  field: string, resolver: Resolver, internalResolvers: Record<string, InternalResolvers>
}) {
  return (
    source: ResolverSource,
    args: ResolverArgs,
    context: ResolverContext,
    info: ResolverInfo,
  ) => {
    const wrappedResolvers : {[model: string]: ModelResolvers } = {}

    Object.keys(internalResolvers)
      .forEach((mod) => {
        const internalResolver = internalResolvers[mod]

        Object.keys(internalResolver)
          .forEach((res) => {
            const alias = res as AliasedResolverEnum

            wrappedResolvers[mod] = wrappedResolvers[mod] || {}

            const cArgs = {
              source, info, context,
            }

            const wrappedResolver = (nArgs : ResolverArgs) => internalResolver[alias]({
              args: nArgs,
              ...cArgs,
            })
            wrappedResolver.unscoped = (nArgs : ResolverArgs) => internalResolver[alias].unscoped({
              args: nArgs,
              ...cArgs,
            })

            wrappedResolvers[mod][alias] = wrappedResolver as any
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
  internalResolvers,
  models,
} : {
  internalResolvers: { [model: string]: InternalResolvers },
  models: SanitizedModel[]
}) {
  const resolvers: { [key: string]: any } = {}

  resolvers.Query = {}
  resolvers.Mutation = {}

  Object.keys(internalResolvers)
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
        ) => internalResolvers[model][res.type]({
          source, args, context, info,
        })
      })
      mutationResolvers.forEach((res) => {
        resolvers.Mutation[baseName + res.suffix] = (
          source: ResolverSource,
          args: ResolverArgs,
          context: ResolverContext,
          info: ResolverInfo,
        ) => internalResolvers[model][res.type]({
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
      const model = extractModelName(field.of)

      resolvers[baseName] = resolvers[baseName] || {}
      const resolver = isArray ? internalResolvers[model].references : internalResolvers[model].reference

      resolvers[baseName][fieldName] = (
        source: ResolverSource,
        args: ResolverArgs,
        context: ResolverContext,
        info: ResolverInfo,
      ) => (resolver as ReferenceResolver)({
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
      const model = extractModelName(field.of)

      if (!internalResolvers[model]) {
        throw new ValidationError(`No model found for name ${model}`)
      }

      resolvers[baseName] = resolvers[baseName] || {}
      const resolver = isArray ? internalResolvers[model].references : internalResolvers[model].reference

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
      extractReferences(field as IPropertySchema)
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
        const baseName = extractModelName(model.name)

        resolvers[baseName] = resolvers[baseName] || {}
        resolvers[baseName][field] = computeFieldResolver({
          resolver: model.resolvers.computed[field],
          internalResolvers,
          field,
        })
      })

    // Create queries
    Object.keys(model.resolvers.queries)
      .forEach((field) => {
        resolvers.Query[field] = computeFieldResolver({
          resolver: model.resolvers.queries[field],
          internalResolvers,
          field,
        })
      })

    // Create mutations
    Object.keys(model.resolvers.mutations)
      .forEach((field) => {
        resolvers.Mutation[field] = computeFieldResolver({
          resolver: model.resolvers.mutations[field],
          internalResolvers,
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
              internalResolvers,
              field,
            })
          })
      })

    // Create federation resolver
    if (!model.external) {
      resolvers[extractModelName(model.name)] = resolvers[extractModelName(model.name)] || {}
      resolvers[extractModelName(model.name)].__resolveReference = (reference: { _id: string }) => (
        internalResolvers[extractModelName(model.name)].read.unscoped({
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
  field,
  adapter,
  model,
  type,
  scope,
  transform,
} : {
  field: string,
  adapter?: IAdapter,
  model: SanitizedModel,
  type: ResolverEnum,
  scope?: Scope<false>,
  transform?: Transform<false>,
}) : ScopedInternalResolver {
  if (!adapter) {
    return async () => null
  }

  return async ({
    source, args, context, info,
  } : {
    source?: ResolverSource,
    args: ResolverArgs,
    context: ResolverContext,
    info: ResolverInfo,
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
      }))) || args)

      value = await adapter[type]({
        source,
        args: scopedArgs as any,
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
          args: scopedArgs as any,
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
      const apolloError = new ApolloError(error.message, error.name)
      apolloError.extensions.status = error.status
      apolloError.extensions.exception = {
        stacktrace: error.stack.split('\n'),
      }
      throw apolloError
    }

    return value
  }
}

function makeReferenceResolver({
  adapter, model, type,
} : {
  adapter?: IAdapter, model: SanitizedModel, type: 'resolveRef'|'resolveRefs', scope?: Function
}) : ReferenceResolver {
  if (!adapter) {
    return () => null
  }

  return async ({
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
        throw new ValidationError('Reversed References cannot be used on an external schema!')
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
  const resolvers :
    Record<AliasedResolverEnum, InternalResolver> &
    Record<'reference'|'references', ReferenceResolver> = {} as any

  const rootResolvers = [...queryResolvers, ...mutationResolvers]

  rootResolvers.forEach((res) => {
    resolvers[res.type] = makeResolver({
      type: res.type,
      adapter,
      model,
      scope: model.scopes[res.type],
      transform: model.transforms[res.type],
      field: extractModelName(model.name) + res.suffix,
    }) as InternalResolver

    resolvers[res.type].unscoped = makeResolver({
      type: res.type,
      adapter,
      model,
      field: extractModelName(model.name) + res.suffix,
    }) as UnscopedInternalResolver

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

  return resolvers
}
