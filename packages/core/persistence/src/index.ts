import GraphQLJson from 'graphql-type-json'
import GraphQLDate from 'graphql-date'

import SchemaTypes from './schema-types'

import { Model, sanitizeModel, FieldMode as FieldModeExport } from './utils/model'
import {
  extractTypesFromModelTo,
  generateFilterTypes,
  generateInputTypes, generateMutationType,
  generateOutputTypes, generateQueryType,
  combineTypes,
  TypeNameMap,
} from './utils/types'
import AccessorClass from './accessor'
import ControllerPersistence from './controller'

export const Types = SchemaTypes
export const FieldMode = FieldModeExport
export const Accessor = AccessorClass
export { SchemaType } from './schema-types'
export { SchemaEntry } from './utils/model'

export class Persistence {
    typeNames : TypeNameMap = {}

    rootTypeNames : TypeNameMap = {}

    models: [Model]

    accessors: { [key: string]: AccessorClass }

    constructor(config) {
      this.initializeProperties(config)
    }

    initializeProperties(config) {
      if (!config) {
        return
      }

      this.accessors = config.accessors || this.accessors
      this.models = config.models || this.models

      if (!config.accessors) {
        this.accessors = { empty: new Accessor() }
      }
    }

    async init(config) {
      this.initializeProperties(config)

      const extractTypesFromModel = extractTypesFromModelTo(this.typeNames, this.rootTypeNames)

      this.models
        .map(sanitizeModel)
        .map(extractTypesFromModel)

      Object.keys(this.accessors).map(a => this.accessors[a].initialize({ models: this.models }))

      return this
    }

    get graphqlTypes() {
      const outputTypes = generateOutputTypes(this.typeNames)
      const inputTypes = generateInputTypes(this.typeNames)
      const filterTypes = generateFilterTypes(this.rootTypeNames, this.typeNames)

      const queryType = generateQueryType(this.rootTypeNames)
      const mutationType = generateMutationType(this.rootTypeNames)

      return combineTypes({
        outputTypes,
        inputTypes,
        filterTypes,

        queryType,
        mutationType,
      })
    }

    get resolvers() {
      const resolvers : {[key: string]: any } = {}

      const defaultAccessor = this.accessors[Object.keys(this.accessors)[0]]

      // Compute accessors resolvers
      this.models.forEach((model) => {
        resolvers.Query = resolvers.Query || {}
        resolvers.Mutation = resolvers.Mutation || {}

        // Query
        const queryResolvers = [
          {
            suffix: '',
            accessor: defaultAccessor.read,
          }, {
            suffix: 'List',
            accessor: defaultAccessor.readMany,
          }, {
            suffix: 'Count',
            accessor: defaultAccessor.count,
          },
        ]

        queryResolvers.forEach((res) => {
          resolvers.Query[model.name + res.suffix] = async (source, args, context, info) => res.accessor.apply(
            defaultAccessor, [{
              source, args, context, info, model,
            }],
          )
        })

        // Mutations
        const mutationResolvers = [
          {
            suffix: 'Create',
            accessor: defaultAccessor.create,
          }, {
            suffix: 'CreateMany',
            accessor: defaultAccessor.createMany,
          }, {
            suffix: 'Update',
            accessor: defaultAccessor.update,
          }, {
            suffix: 'UpdateMany',
            accessor: defaultAccessor.updateMany,
          }, {
            suffix: 'Delete',
            accessor: defaultAccessor.delete,
          }, {
            suffix: 'DeleteMany',
            accessor: defaultAccessor.deleteMany,
          },
        ]

        mutationResolvers.forEach((res) => {
          resolvers.Mutation[model.name + res.suffix] = async (source, args, context, info) => res.accessor.apply(
            defaultAccessor, [{
              source, args, context, info, model,
            }],
          )
        })
      })

      // Compute ref resolvers
      Object.entries(this.typeNames)
        .forEach(([name, type]) => {
          // Search for ref fields
          Object.entries(type.schema)
            .filter(([fieldName, fieldType]) => fieldType.type === 'reference')
            .forEach(([fieldName, fieldType]) => {
              resolvers[type.output] = resolvers[type.output] || {}
              resolvers[type.output][fieldName] = async (source, args, context, info) => defaultAccessor
                .resolveRef({
                  source,
                  args,
                  context,
                  info,
                  fieldName,
                  model: this.models.find(m => m.name === fieldType.of),
                })
            })

          // Search for array ref fields
          Object.entries(type.schema)
            .filter(([fieldName, fieldType]) => fieldType.type === 'array' && fieldType.of.type === 'reference')
            .forEach(([fieldName, fieldType]) => {
              resolvers[type.output] = resolvers[type.output] || {}
              resolvers[type.output][fieldName] = async (source, args, context, info) => defaultAccessor
                .resolveRefs({
                  source,
                  args,
                  context,
                  info,
                  fieldName,
                  model: this.models.find(m => m.name === fieldType.of.of),
                })
            })
        })

      // Compute fields resolvers
      this.models.forEach((model) => {
        const rootName = this.rootTypeNames[model.name].output

        Object.entries(model.fields || {})
          .forEach(([name, field]) => {
            if (field.resolve) {
              resolvers[rootName] = resolvers[rootName] || {}
              resolvers[rootName][name] = async (source, args, context, info) => field.resolve({
                source, args, context, info,
              })
            }
          })
      })

      resolvers.JSON = GraphQLJson
      resolvers.Date = GraphQLDate

      return resolvers
    }

    controller({ path, enablePlayground }) {
      return ControllerPersistence({
        path,
        enablePlayground,
        graphqlTypes: this.graphqlTypes,
        resolvers: this.resolvers,
      })
    }
}
