import {
  SchemaType, FieldMode, FieldModeEnum, Fields, Model, SchemaEntry, Schema,
} from '@harmonyjs/types-persistence'

import {
  extractModelType, printGraphqlInputType, printGraphqlProp, printGraphqlType,
} from '../utils/types'
import { extractNestedType, isNestedType } from '../utils/model'

import Types from './schema-types'

class PropertiesInfo {
  primitiveProperties: {[key: string]: SchemaType} = {}

  nestedProperties: {[key: string]: NestedProperty} = {}

  propertiesArgs: {[key: string]: {[key: string] : SchemaEntry | NestedProperty}} = {}

  fieldsMode: {[key: string] : FieldModeEnum[]} = {}

  flattenNestedTypes() {
    return Object.values(this.nestedProperties)
      .flatMap((nestedType) => [nestedType, ...nestedType.fields.flattenNestedTypes()])
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
            input: true,
          }
        }

        if (type instanceof NestedProperty) { // eslint-disable-line
          const wrapper = type.type instanceof SchemaType ? type.type : new SchemaType('nested')

          return ({
            property: arg,
            type: wrapper,
            nested: type.inputTypeName,
            input: true,
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
}

export class NestedProperty {
  fields = new PropertiesInfo()

  typeName = null

  schema: Schema = null

  modes = null

  constructor(public type: SchemaEntry, parentName, property, modes) {
    this.typeName = parentName + extractModelType(property)

    this.schema = extractNestedType(type)

    this.modes = modes

    Object.entries(this.schema)
      .forEach(([prop, t]) => {
        if (isNestedType(t)) {
          this.fields.nestedProperties[prop] = new NestedProperty(t, this.typeName, prop, modes)
        } else {
          this.fields.primitiveProperties[prop] = t as SchemaType
        }
      })
  }

  get outputTypeName() {
    return this.typeName
  }

  get inputTypeName() {
    return `${this.typeName}Input`
  }

  get outputType() {
    return printGraphqlType({
      name: this.outputTypeName,
      properties: [
        ...this.fields.getPrimitivePropertiesOutput(),
        ...this.fields.getNestedPropertiesOutput(),
      ],
    })
  }

  get inputType() {
    return printGraphqlInputType({
      name: this.inputTypeName,
      properties: [
        ...this.fields.getPrimitivePropertiesInput(),
        ...this.fields.getNestedPropertiesInput(),
      ],
    })
  }

  get argumentType() {
    return `${Object.values(this.fields.nestedProperties).map((p) => p.argumentType).join('')}
    
${printGraphqlInputType({
    name: this.inputTypeName,
    properties: [
      ...this.fields.getPrimitivePropertiesInput(),
      ...this.fields.getNestedPropertiesInput(),
    ],
  })}`
  }

  get types() {
    return `
${Object.values(this.fields.nestedProperties).map((p) => p.types).join('')}

${(this.modes.includes(FieldMode.OUTPUT)) ? this.outputType : ''}
${(this.modes.includes(FieldMode.INPUT)) ? this.inputType : ''}
`
  }
}

// Compute transient queries
/* eslint-disable no-param-reassign */
function computeTransient({
  fields,
  fieldsInfo,
  typeName = '',
} : {
  fields: Fields,
  fieldsInfo: PropertiesInfo,
  typeName?: string
}) {
  if (fields) {
    Object.entries(fields)
      .forEach(([property, field]) => {
        delete fieldsInfo.primitiveProperties[property]
        delete fieldsInfo.nestedProperties[property]

        if (isNestedType(field.type)) {
          fieldsInfo.nestedProperties[property] = new NestedProperty(
            field.type, typeName, property, field.mode,
          )
          fieldsInfo.propertiesArgs[property] = field.args
          fieldsInfo.fieldsMode[property] = field.mode as FieldModeEnum[]
        } else {
          fieldsInfo.primitiveProperties[property] = field.type as SchemaType
          fieldsInfo.propertiesArgs[property] = field.args
          fieldsInfo.fieldsMode[property] = field.mode as FieldModeEnum[]
        }
      })

    // Compute transient nested arguments
    Object.entries(fieldsInfo.propertiesArgs)
      .forEach(([property, args]) => {
        if (args) {
          Object.entries(args)
            .forEach(([prop, type]) => {
              if (isNestedType(type as SchemaEntry)) {
                fieldsInfo.propertiesArgs[property][prop] = new NestedProperty(
                  type as SchemaEntry, `${typeName}${extractModelType(property)}Args`, prop, [],
                )
              }
            })
        }
      })
  }
}
/* eslint-enable no-param-reassign */

export default class SchemaModel {
  typeName = null

  fields = new PropertiesInfo()

  fieldQueries = new PropertiesInfo()

  fieldMutations = new PropertiesInfo()

  constructor(private model: Model) {
    this.typeName = extractModelType(model.name)

    // Compute schema
    Object.entries(model.schema)
      .forEach(([property, type]) => {
        if (isNestedType(type)) {
          this.fields.nestedProperties[property] = new NestedProperty(
            type, this.typeName, property, [FieldMode.INPUT, FieldMode.OUTPUT],
          )
        } else {
          this.fields.primitiveProperties[property] = type as SchemaType
        }
      })

    // Compute transient
    if (model.fields) {
      computeTransient({ fields: model.fields.fields, fieldsInfo: this.fields, typeName: this.typeName })
      computeTransient({ fields: model.fields.queries, fieldsInfo: this.fieldQueries })
      computeTransient({ fields: model.fields.mutations, fieldsInfo: this.fieldMutations })
    }
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
    const queryExtension = `${this.fieldQueries.getPrimitivePropertiesOutput().map(printGraphqlProp).join('\n')}
${this.fieldQueries.getNestedPropertiesOutput().map(printGraphqlProp).join('\n')}`
      .split('\n').filter((l) => !!l.trim()).join('\n').trim()

    if (queryExtension) {
      return `
${Object.values(this.fieldQueries.nestedProperties).map((p) => p.types).join('')}

${Object.values(this.fieldQueries.propertiesArgs)
    .filter((args) => !!args)
    .flatMap(
      (args) => Object.values(args)
        .map((p) => (p instanceof NestedProperty ? p.argumentType : null))
        .filter((t) => !!t),
    ).join('')
}

extend type Query {
${queryExtension}
}
`
    }

    return ''
  }

  get mutations() {
    const mutationExtension = `${this.fieldMutations.getPrimitivePropertiesOutput().map(printGraphqlProp).join('\n')}
${this.fieldMutations.getNestedPropertiesOutput().map(printGraphqlProp).join('\n')}`
      .split('\n').filter((l) => !!l.trim()).join('\n').trim()

    if (mutationExtension) {
      return `
${Object.values(this.fieldMutations.nestedProperties).map((p) => p.types).join('')}

${Object.values(this.fieldMutations.propertiesArgs)
    .filter((args) => !!args)
    .flatMap(
      (args) => Object.values(args)
        .map((p) => (p instanceof NestedProperty ? p.argumentType : null))
        .filter((t) => !!t),
    ).join('')
}

extend type Mutation {
${mutationExtension}
}
`
    }

    return ''
  }

  get outputType() {
    return printGraphqlType({
      name: this.outputTypeName,
      properties: [
        ...this.fields.getPrimitivePropertiesOutput(),
        ...this.fields.getNestedPropertiesOutput(),
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
        ...this.fields.getPrimitivePropertiesInput(),
        ...this.fields.getNestedPropertiesInput(),
      ],
    })
  }

  get inputWithIDType() {
    return printGraphqlInputType({
      name: this.inputTypeNameWithID,
      properties: [
        { property: '_id', type: Types.ID.required },
        ...this.fields.getPrimitivePropertiesInput(),
        ...this.fields.getNestedPropertiesInput(),
      ],
    })
  }

  get inputFilterType() {
    return printGraphqlInputType({
      name: this.inputTypeNameFilter,
      properties: [
        { property: '_id', type: Types.ID },
        { property: '_ids', type: Types.Array.of(Types.ID) },
        ...this.fields.getPrimitivePropertiesInput(),
        ...this.fields.getNestedPropertiesInput(),
        { property: '_operators', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
        { property: '_or', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
        { property: '_and', type: Types.Array.of(new SchemaType('nested')), nested: this.inputTypeName },
      ],
    })
  }

  get types() {
    if (this.model.external) {
      return `
${this.queries}
${this.mutations}

${this.outputType}
`
    }

    return `
${this.queries}
${this.mutations}

${Object.values(this.fields.nestedProperties).map((p) => p.types).join('')}

${Object.values(this.fields.propertiesArgs)
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
