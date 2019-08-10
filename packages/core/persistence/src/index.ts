import SchemaTypes from './schema-types'

import { Model, sanitizeModel, FieldMode as FieldModeExport } from './utils/model'
import {
  extractTypesFromModelTo,
  generateFilterTypes,
  generateInputTypes, generateMutationType,
  generateOutputTypes, generateQueryType,
  TypeNameMap,
} from './utils/types'
import AccessorClass from './accessor'

export const Types = SchemaTypes
export const FieldMode = FieldModeExport
export const Accessor = AccessorClass
export { SchemaType } from './schema-types'
export { SchemaEntry } from './utils/model'

export class Persistence {
    typeNames : TypeNameMap = {}

    rootTypeNames : TypeNameMap = {}

    constructor(private models?: [Model], private accessors?: [AccessorClass]) {
      const extractTypesFromModel = extractTypesFromModelTo(this.typeNames, this.rootTypeNames)

      models
        .map(sanitizeModel)
        .map(extractTypesFromModel)

      if (!accessors) {
        this.accessors = [new Accessor()]
      }

      this.accessors.map(a => a.initialize({ models }))
    }

    get graphqlTypes() {
      const outputTypes = generateOutputTypes(this.typeNames)
      const inputTypes = generateInputTypes(this.typeNames)
      const filterTypes = generateFilterTypes(this.rootTypeNames, this.typeNames)

      const queryType = generateQueryType(this.rootTypeNames)
      const mutationType = generateMutationType(this.rootTypeNames)

      return `
${outputTypes}

${inputTypes}

${filterTypes}


${queryType}
          
${mutationType}
`
    }

    get resolvers() {
      const resolvers : {[key: string]: any } = {}

      // Compute accessors resolvers
      this.models.forEach((model) => {
        resolvers.Query = resolvers.Query || {}
        resolvers.Mutation = resolvers.Mutation || {}

        // Query
        resolvers.Query[model.name] = async (source, args, context, info) => this.accessors[0]
          .read({
            source, args, context, info, model,
          })
        resolvers.Query[`${model.name}List`] = async (source, args, context, info) => this.accessors[0]
          .readMany({
            source, args, context, info, model,
          })
        resolvers.Query[`${model.name}Count`] = async (source, args, context, info) => this.accessors[0]
          .count({
            source, args, context, info, model,
          })

        // Mutations
        resolvers.Mutation[`${model.name}Create`] = async (source, args, context, info) => this.accessors[0]
          .create({
            source, args, context, info, model,
          })
        resolvers.Mutation[`${model.name}CreateMany`] = async (source, args, context, info) => this.accessors[0]
          .createMany({
            source, args, context, info, model,
          })
        resolvers.Mutation[`${model.name}Update`] = async (source, args, context, info) => this.accessors[0]
          .update({
            source, args, context, info, model,
          })
        resolvers.Mutation[`${model.name}UpdateMany`] = async (source, args, context, info) => this.accessors[0]
          .updateMany({
            source, args, context, info, model,
          })
        resolvers.Mutation[`${model.name}Delete`] = async (source, args, context, info) => this.accessors[0]
          .delete({
            source, args, context, info, model,
          })
        resolvers.Mutation[`${model.name}DeleteMany`] = async (source, args, context, info) => this.accessors[0]
          .deleteMany({
            source, args, context, info, model,
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
              resolvers[type.output][fieldName] = async (source, args, context, info) => this.accessors[0]
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
              resolvers[type.output][fieldName] = async (source, args, context, info) => this.accessors[0]
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

      return resolvers
    }
}
