import {
  Fields, Field, Property, SanitizedModel,
} from '@harmonyjs/types-persistence'

import { extractModelType } from './types'

// Query
export const queryResolvers = [
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
export const mutationResolvers = [
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
  }, {
    type: 'delete',
    suffix: 'Delete',
  }, {
    type: 'deleteMany',
    suffix: 'DeleteMany',
  },
]

const unscoped = ({ args }) => args


/* eslint-disable no-param-reassign */
export function computeMainResolvers({
  models,
  accessors,
  defaultAccessor,
  resolvers,
  localResolvers,
}) {
  models.forEach((model) => {
    const modelType = extractModelType(model.name)
    const modelQuery = extractModelType(model.name, false)

    localResolvers[modelType] = {}

    const modelAccessor = model.accessor ? accessors[model.accessor] : defaultAccessor
    const accessor = modelAccessor || defaultAccessor

    if (model.external) {
      // Do not generate base resolvers for external models
      return
    }

    const makeResolvers = (mainType) => (res) => {
      const makeResolver = (scoped) => async (source, args, context, info) => {
        // Check for a scope function
        const scope = (scoped && model.scopes && model.scopes[res.type]) || unscoped

        const scopedArgs = scope({ args: JSON.parse(JSON.stringify(args)), context })

        return accessor[res.type]
          .apply(
            defaultAccessor, [{
              source,
              info,
              model,
              context,
              args: scopedArgs || args,
            }],
          )
      }

      const scopedResolver = makeResolver(true)
      const unscopedResolver = makeResolver(false)

      mainType[modelQuery + res.suffix] = scopedResolver
      localResolvers[modelType][res.type] = scopedResolver
      localResolvers[modelType][res.type].unscoped = unscopedResolver

      if (res.alias) {
        res.alias.forEach((alias) => {
          localResolvers[modelType][alias] = scopedResolver
          localResolvers[modelType][alias].unscoped = unscopedResolver
        })
      }
    }

    const makeQueryResolvers = makeResolvers(resolvers.Query)
    const makeMutationResolvers = makeResolvers(resolvers.Mutation)

    queryResolvers.forEach(makeQueryResolvers)
    mutationResolvers.forEach(makeMutationResolvers)

    // Reference Resolver for Federation
    resolvers[modelType] = resolvers[modelType] || {}
    resolvers[modelType].__resolveReference = async (reference) => accessor.read({
      args: {
        _id: reference._id,
      },
      model,
      source: null,
      context: null,
      info: null,
    })
  })
}

function flattenNestedType(nested) {
  return [
    nested,
    ...Object.values(nested.of)
      .filter((prop : Property) => {
        const propIsNested = prop.type === 'nested'
        const deepIsNested = !!prop.deepOf && prop.deepOf.type === 'nested'

        return propIsNested || deepIsNested
      })
      .map((prop : Property) => (prop.type === 'nested' ? prop : prop.deepOf))
      .flatMap(flattenNestedType),
  ]
}

export function computeReferenceResolvers({
  models,
  accessors,
  defaultAccessor,
  resolvers,
}) {
  const types = models.flatMap((model) => flattenNestedType(model.schema))

  const makeReferenceResolver = (type, fieldName, comparator, isArray) => {
    const typeName = type.name

    const model = models.find((m) => m.name === comparator)
    const rootName = extractModelType(model.name)

    const modelAccessor = model.accessor ? accessors[model.accessor] : defaultAccessor
    const accessor = modelAccessor || defaultAccessor

    resolvers[typeName] = resolvers[typeName] || {}
    resolvers[typeName][fieldName] = async (source, args, context, info) => {
      if (model.external) {
        // In case of an external Federation model, return a Representation
        return {
          __typename: rootName,
          _id: source[fieldName],
        }
      }

      const resolver = isArray ? accessor.resolveRefs : accessor.resolveRef

      // Else, use the accessor reference resolver
      return resolver({
        source,
        args,
        context,
        info,
        fieldName,
        model,
      })
    }
  }

  types.forEach((type) => {
    const references = Object.values(type.of)
      .filter((prop : Property) => prop.type === 'reference')

    const composedReferences = Object.values(type.of)
      .filter((prop : Property) => (prop.of && prop.of instanceof Property && prop.of.type === 'reference'))

    // Make direct reference fields
    references.forEach((prop : Property) => makeReferenceResolver(type, prop._configuration.name, prop.of, false))

    // Make composed reference fields
    composedReferences.forEach(
      (prop : Property) => makeReferenceResolver(
        type, prop._configuration.name, prop.of instanceof Property && prop.of.of,
        prop.type === 'array',
      ),
    )
  })
}

export function computeFieldResolvers({
  models,
  resolvers,
  localResolvers,
}) {
  // Compute fields resolvers
  models.forEach((model : SanitizedModel) => {
    function computeResolver({ fields, rootName } : { fields: {[key: string]: Field}, rootName: string}) {
      Object.entries(fields)
        .forEach(([name, field]) => {
          if (field.resolve) {
            resolvers[rootName] = resolvers[rootName] || {}
            resolvers[rootName][name] = async (source, args, context, info) => {
              const wrappedResolvers = {}

              Object.keys(localResolvers)
                .forEach((mod) => {
                  wrappedResolvers[mod] = {}
                  Object.keys(localResolvers[mod])
                    .forEach((resolver) => {
                      wrappedResolvers[mod][resolver] = (localArgs) => localResolvers[mod][resolver](
                        source,
                        localArgs,
                        context,
                        info,
                      )

                      wrappedResolvers[mod][resolver].unscoped = (localArgs) => localResolvers[mod][resolver].unscoped(
                        source,
                        localArgs,
                        context,
                        info,
                      )
                    })
                })

              return field.resolve({
                source, args, context, info, resolvers: wrappedResolvers,
              })
            }
          }
        })
    }

    const fields : {[key: string]: Field} = (model.computed ? model.computed.fields : {}) || {}
    const queries : {[key: string]: Field} = (model.computed ? model.computed.queries : {}) || {}
    const mutations : {[key: string]: Field} = (model.computed ? model.computed.mutations : {}) || {}
    const custom = (model.computed ? model.computed.custom : {}) || {}

    computeResolver({
      fields,
      rootName: extractModelType(model.name),
    })
    computeResolver({
      fields: queries,
      rootName: 'Query',
    })
    computeResolver({
      fields: mutations,
      rootName: 'Mutation',
    })
    Object.entries(custom).forEach(([customName, customFields]) => {
      computeResolver({
        fields: customFields,
        rootName: customName,
      })
    })
  })
}
/* eslint-enable no-param-reassign */
