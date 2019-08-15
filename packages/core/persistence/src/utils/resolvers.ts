import { Field } from '@harmonyjs/types-persistence'

import { extractModelType } from './types'
import SchemaModel, { NestedProperty } from '../entities/schema-model'

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
    localResolvers[extractModelType(model.name)] = {}

    const modelAccessor = model.accessor ? accessors[model.accessor] : defaultAccessor
    const accessor = modelAccessor || defaultAccessor

    if (model.external) {
      // Do not generate base resolvers for external models
      return
    }

    queryResolvers.forEach((res) => {
      resolvers.Query[model.name + res.suffix] = async (source, args, context, info) => {
        // Check for a scope function
        const scope = (model.scopes && model.scopes[res.type]) || unscoped

        return accessor[res.type]
          .apply(
            defaultAccessor, [{
              source,
              info,
              model,
              context,
              args: scope({ args, context }),
            }],
          )
      }

      localResolvers[extractModelType(model.name)][res.type] = resolvers.Query[model.name + res.suffix]

      if (res.alias) {
        res.alias.forEach((alias) => {
          localResolvers[extractModelType(model.name)][alias] = resolvers.Query[model.name + res.suffix]
        })
      }
    })

    mutationResolvers.forEach((res) => {
      resolvers.Mutation[model.name + res.suffix] = async (source, args, context, info) => {
        // Check for a scope function
        const scope = (model.scopes && model.scopes[res.type]) || unscoped

        return accessor[res.type]
          .apply(
            defaultAccessor, [{
              source,
              info,
              model,
              context,
              args: scope({ args, context }),
            }],
          )
      }

      localResolvers[extractModelType(model.name)][res.type] = resolvers.Mutation[model.name + res.suffix]
    })

    // Reference Resolver for Federation
    resolvers[extractModelType(model.name)] = resolvers[extractModelType(model.name)] || {}
    resolvers[extractModelType(model.name)].__resolveReference = async (reference) => accessor.read({
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

export function computeReferenceResolvers({
  models,
  schemaModels,
  accessors,
  defaultAccessor,
  resolvers,
}) {
  const nestedTypes = schemaModels.flatMap((model) => model.fields.flattenNestedTypes())
  const types : (SchemaModel | NestedProperty)[] = [...schemaModels, ...nestedTypes]

  const makeReferenceResolver = (typeName, fieldName, comparator) => {
    resolvers[typeName] = resolvers[typeName] || {}
    resolvers[typeName][fieldName] = async (source, args, context, info) => {
      const model = models.find((m) => m.name === comparator)
      const rootName = extractModelType(model.name)

      if (model.external) {
        // In case of an external Federation model, return a Representation
        return {
          __typename: rootName,
          _id: source[fieldName],
        }
      }

      // Else, use the accessor reference resolver
      const modelAccessor = model.accessor ? accessors[model.accessor] : defaultAccessor
      const accessor = modelAccessor || defaultAccessor

      return accessor
        .resolveRef({
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
    const references = type.fields.getPrimitiveProperties()
      .filter((prop) => prop.type.type === 'reference')

    const composedReferences = type.fields.getPrimitiveProperties()
      .filter((prop) => (prop.type.of && prop.type.of.type === 'reference'))

    // Make direct reference fields
    references.forEach((prop) => makeReferenceResolver(type.typeName, prop.property, prop.type.of))

    // Make composed reference fields
    composedReferences.forEach((prop) => makeReferenceResolver(type.typeName, prop.property, prop.type.of.of))
  })
}

export function computeFieldResolvers({
  models,
  resolvers,
  localResolvers,
}) {
  // Compute fields resolvers
  models.forEach((model) => {
    function computeResolver({ fields, rootName } : { fields: {[key: string]: Field}, rootName: string}) {
      Object.entries(fields)
        .forEach(([name, field]) => {
          if (field.resolve) {
            console.log(`Found field ${name} on root ${rootName}`)
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
                    })
                })

              return field.resolve({
                source, args, context, info, resolvers: wrappedResolvers,
              })
            }
          }
        })
    }

    const fields : {[key: string]: Field} = (model.fields ? model.fields.fields : {}) || {}
    const queries : {[key: string]: Field} = (model.fields ? model.fields.queries : {}) || {}
    const mutations : {[key: string]: Field} = (model.fields ? model.fields.mutations : {}) || {}

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
  })
}
/* eslint-enable no-param-reassign */
