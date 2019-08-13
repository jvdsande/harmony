import {
  FieldMode, FieldModeEnum, Model, Schema, SchemaEntry,
} from './model'
import {
  extractModelType, printGraphqlInputType, printGraphqlProp, printGraphqlType,
} from '../utils/types'
import { extractNestedType, isNestedType } from '../utils/model'
import Types, { SchemaType } from './schema-types'

export class NestedProperty {
  primitiveProperties : {[key: string]: SchemaType} = {}

  nestedProperties: {[key: string]: NestedProperty} = {}

  typeName = null

  schema : Schema = null

  constructor(public type: SchemaEntry, parentName, property) {
    this.typeName = parentName + extractModelType(property)

    this.schema = extractNestedType(type)

    Object.entries(this.schema)
      .forEach(([prop, t]) => {
        if (isNestedType(t)) {
          this.nestedProperties[prop] = new NestedProperty(t, this.typeName, prop)
        } else {
          this.primitiveProperties[prop] = t as SchemaType
        }
      })
  }

  flattenNestedTypes() {
    return Object.values(this.nestedProperties)
      .flatMap((nestedType) => [nestedType, ...nestedType.flattenNestedTypes()])
  }

  get outputTypeName() {
    return this.typeName
  }

  get inputTypeName() {
    return `${this.typeName}Input`
  }

  getPrimitiveProperties() {
    return Object.entries(this.primitiveProperties)
      .map(([property, type]) => ({ property, type }))
  }

  getNestedProperties() {
    return Object.entries(this.nestedProperties)
      .map(([property, nested]) => {
        const wrapper = nested.type instanceof SchemaType ? nested.type : new SchemaType('nested')

        return ({
          property,
          type: wrapper,
          nested,
        })
      })
  }

  getPrimitivePropertiesOutput() {
    return this.getPrimitiveProperties()
  }

  getNestedPropertiesOutput() {
    return this.getNestedProperties()
      .map((prop) => ({ ...prop, nested: prop.nested.outputTypeName }))
  }

  getPrimitivePropertiesInput() {
    return this.getPrimitiveProperties()
      .map((prop) => ({ ...prop, input: true }))
  }

  getNestedPropertiesInput() {
    return this.getNestedProperties()
      .map((prop) => ({ ...prop, input: true }))
      .map((prop) => ({ ...prop, nested: prop.nested.inputTypeName }))
  }

  getPrimitivePropertiesArgs() {
    return this.getPrimitiveProperties()
      .map((prop) => ({ ...prop, input: true }))
  }

  getNestedPropertiesArgs() {
    return this.getNestedProperties()
      .map((prop) => ({ ...prop, input: true }))
      .map((prop) => ({ ...prop, nested: prop.nested.outputTypeName }))
  }

  get outputType() {
    return printGraphqlType({
      name: this.outputTypeName,
      properties: [
        ...this.getPrimitivePropertiesOutput(),
        ...this.getNestedPropertiesOutput(),
      ],
    })
  }

  get inputType() {
    return printGraphqlInputType({
      name: this.inputTypeName,
      properties: [
        ...this.getPrimitivePropertiesInput(),
        ...this.getNestedPropertiesInput(),
      ],
    })
  }

  get argumentType() {
    return `${Object.values(this.nestedProperties).map((p) => p.argumentType).join('')}
    
${printGraphqlInputType({
    name: this.outputTypeName,
    properties: [
      ...this.getPrimitivePropertiesArgs(),
      ...this.getNestedPropertiesArgs(),
    ],
  })}`
  }

  get types() {
    return `
${Object.values(this.nestedProperties).map((p) => p.types).join('')}

${this.outputType}
${this.inputType}
`
  }
}

export default class SchemaModel {
  primitiveProperties : {[key: string]: SchemaType} = {}

  nestedProperties: {[key: string]: NestedProperty} = {}

  propertiesArgs: {[key: string]: {[key: string] : SchemaEntry | NestedProperty}} = {}

  fieldsMode: {[key: string] : FieldModeEnum[]} = {}

  typeName = null

  constructor(private model: Model) {
    this.typeName = extractModelType(model.name)

    // Compute schema
    Object.entries(model.schema)
      .forEach(([property, type]) => {
        if (isNestedType(type)) {
          this.nestedProperties[property] = new NestedProperty(type, this.typeName, property)
        } else {
          this.primitiveProperties[property] = type as SchemaType
        }
      })

    // Compute transient fields
    if (model.fields && model.fields.fields) {
      Object.entries(model.fields.fields)
        .forEach(([property, field]) => {
          delete this.primitiveProperties[property]
          delete this.nestedProperties[property]

          if (isNestedType(field.type)) {
            this.nestedProperties[property] = new NestedProperty(field.type, this.typeName, property)
            this.propertiesArgs[property] = field.args
            this.fieldsMode[property] = field.mode as FieldModeEnum[]
          } else {
            this.primitiveProperties[property] = field.type as SchemaType
            this.propertiesArgs[property] = field.args
            this.fieldsMode[property] = field.mode as FieldModeEnum[]
          }
        })

      // Compute transient nested arguments
      Object.entries(this.propertiesArgs)
        .forEach(([property, args]) => {
          if (args) {
            Object.entries(args)
              .forEach(([prop, type]) => {
                if (isNestedType(type as SchemaEntry)) {
                  this.propertiesArgs[property][prop] = new NestedProperty(
                    type as SchemaEntry, `${this.typeName}${extractModelType(property)}Args`, prop,
                  )
                }
              })
          }
        })
    }
  }

  flattenNestedTypes() {
    return Object.values(this.nestedProperties)
      .flatMap((nestedType) => [nestedType, ...nestedType.flattenNestedTypes()])
  }

  get outputTypeName() {
    return this.typeName
  }

  get payloadTypeName() {
    return `${this.typeName}Payload`
  }

  get payloadManyTypeName() {
    return `${this.typeName}PayloadMany`
  }

  get inputTypeName() {
    return `${this.typeName}Input`
  }

  get inputTypeNameWithID() {
    return `${this.typeName}InputWithID`
  }

  get inputTypeNameFilter() {
    return `${this.typeName}InputFilter`
  }

  get queries() {
    const { name } = this.model

    return `
extend type Query {
  ${name}(filter: ${this.inputTypeNameFilter}) : ${this.outputTypeName}
  ${name}List(filter: ${this.inputTypeNameFilter}, skip: Int, limit: Int, sort: Int) : [${this.outputTypeName}]
  ${name}Count(filter: ${this.inputTypeNameFilter}) : Int
}
    `
  }

  get mutations() {
    const { name } = this.model

    return `
extend type Mutation {
  ${name}Create(record: ${this.inputTypeName}) : ${this.payloadTypeName}
  ${name}CreateMany(records: [${this.inputTypeName}]) : ${this.payloadManyTypeName}
  
  ${name}Update(record: ${this.inputTypeNameWithID}) : ${this.payloadTypeName}
  ${name}UpdateMany(records: [${this.inputTypeNameWithID}]) : ${this.payloadManyTypeName}
  
  ${name}Delete(_id: ID!) : ${this.payloadTypeName}
  ${name}DeleteMany(_ids: [ID!]) : ${this.payloadManyTypeName}
}
    `
  }

  getArgs(args) {
    if (!args) {
      return null
    }

    return Object.entries(args)
      .map(([arg, type]) => {
        if (type instanceof SchemaType) {
          return {
            property: arg,
            type,
          }
        }

        if (type instanceof NestedProperty) {
          const wrapper = type.type instanceof SchemaType ? type.type : new SchemaType('nested')

          return ({
            property: arg,
            type: wrapper,
            nested: type.outputTypeName,
          })
        }

        return null
      })
      .filter((arg) => !!arg)
  }

  getPrimitiveProperties() {
    return Object.entries(this.primitiveProperties)
      .map(([property, type]) => ({ property, type, args: this.getArgs(this.propertiesArgs[property]) }))
  }

  getNestedProperties() {
    return Object.entries(this.nestedProperties)
      .map(([property, nested]) => {
        const wrapper = nested.type instanceof SchemaType ? nested.type : new SchemaType('nested')

        return ({
          property,
          type: wrapper,
          nested,
          args: this.getArgs(this.propertiesArgs[property]),
        })
      })
  }

  getPrimitivePropertiesOutput() {
    return this.getPrimitiveProperties()
      .filter((prop) => (!this.fieldsMode[prop.property] || this.fieldsMode[prop.property].includes(FieldMode.OUTPUT)))
  }

  getNestedPropertiesOutput() {
    return this.getNestedProperties()
      .filter((prop) => (!this.fieldsMode[prop.property] || this.fieldsMode[prop.property].includes(FieldMode.OUTPUT)))
      .map((prop) => ({ ...prop, nested: prop.nested.outputTypeName }))
  }

  getPrimitivePropertiesInput() {
    return this.getPrimitiveProperties()
      .filter((prop) => (!this.fieldsMode[prop.property] || this.fieldsMode[prop.property].includes(FieldMode.INPUT)))
      .map((prop) => ({ ...prop, input: true, args: null }))
  }

  getNestedPropertiesInput() {
    return this.getNestedProperties()
      .filter((prop) => (!this.fieldsMode[prop.property] || this.fieldsMode[prop.property].includes(FieldMode.INPUT)))
      .map((prop) => ({ ...prop, input: true, args: null }))
      .map((prop) => ({ ...prop, nested: prop.nested.inputTypeName }))
  }

  get outputType() {
    return printGraphqlType({
      name: this.outputTypeName,
      properties: [
        ...this.getPrimitivePropertiesOutput(),
        ...this.getNestedPropertiesOutput(),
      ],
      external: this.model.external,
      root: true,
    })
  }

  get payloadType() {
    return printGraphqlType({
      name: this.payloadTypeName,
      properties: [
        { property: 'record', type: new SchemaType('nested'), nested: this.outputTypeName },
        { property: 'recordId', type: Types.ID },
      ],
    })
  }

  get payloadManyType() {
    return printGraphqlType({
      name: this.payloadManyTypeName,
      properties: [
        { property: 'records', type: Types.Array.of(new SchemaType('nested')), nested: this.outputTypeName },
        { property: 'recordIds', type: Types.Array.of(Types.ID) },
      ],
    })
  }

  get inputType() {
    return printGraphqlInputType({
      name: this.inputTypeName,
      properties: [
        ...this.getPrimitivePropertiesInput(),
        ...this.getNestedPropertiesInput(),
      ],
    })
  }

  get inputWithIDType() {
    return printGraphqlInputType({
      name: this.inputTypeNameWithID,
      properties: [
        { property: '_id', type: Types.ID.required },
        ...this.getPrimitivePropertiesInput(),
        ...this.getNestedPropertiesInput(),
      ],
    })
  }

  get inputFilterType() {
    return printGraphqlInputType({
      name: this.inputTypeNameFilter,
      properties: [
        { property: '_id', type: Types.ID },
        { property: '_ids', type: Types.Array.of(Types.ID) },
        ...this.getPrimitivePropertiesInput(),
        ...this.getNestedPropertiesInput(),
        { property: '_operators', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
        { property: '_or', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
        { property: '_and', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
      ],
    })
  }

  get types() {
    if (this.model.external) {
      return this.outputType
    }

    return `
${this.queries}
${this.mutations}

${Object.values(this.nestedProperties).map((p) => p.types).join('')}

${Object.values(this.propertiesArgs)
    .filter((args) => !!args)
    .flatMap(
      (args) => Object.values(args)
        .map((p) => (p instanceof NestedProperty ? p.argumentType : null))
        .filter((t) => !!t),
    ).join('')
}

${this.outputType}
${this.payloadType}
${this.payloadManyType}

${this.inputType}
${this.inputWithIDType}
${this.inputFilterType}
`
  }
}
