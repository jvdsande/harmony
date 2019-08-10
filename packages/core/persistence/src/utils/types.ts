import Voca from 'voca'

import { SchemaType } from '../schema-types'
import {
  FieldMode, Fields, isNestedType, Model, Schema, SchemaEntry,
} from './model'


export type TypeName = {
    output: string,
    input: string,
    filter?: string,

    schema?: Schema,
    fields?: Fields,
}

export type TypeNameMap = {
    [name: string]: TypeName
}


function extractModelType(name : string) : string {
  return Voca.capitalize(Voca.camelCase(name))
}

function extractModelInputType(name : string) : string {
  return `${extractModelType(name)}Input`
}

function extractModelFilterInputType(name : string) : string {
  return `${extractModelType(name)}InputFilter`
}


export function extractTypesFromModelTo(typeNames : TypeNameMap, rootTypeNames : TypeNameMap) {
  function extractTypesFromSchema(schema : Schema, name : string) {
    Object.entries(schema)
      .forEach(([key, type]) => {
        if (isNestedType(type)) {
          extractTypesFromSchema(type.of || type, `${name}-${key}`)
        }
      })

        typeNames[name] = { // eslint-disable-line
      output: extractModelType(name),
      input: extractModelInputType(name),
      schema,
    }
  }

  return function extractTypesFromModel(model : Model) {
    extractTypesFromSchema(model.schema, model.name)

    Object.entries(model.fields || {})
      .forEach(([key, field]) => {
        if (!(field.type instanceof SchemaType)) {
          extractTypesFromSchema(field.type, `${model.name}-${key}`)

          if (!field.mode.includes(FieldMode.OUTPUT)) {
                        delete typeNames[`${model.name}-${key}`].output // eslint-disable-line
          }
          if (!field.mode.includes(FieldMode.INPUT)) {
                        delete typeNames[`${model.name}-${key}`].input // eslint-disable-line
          }
        }
      })

        rootTypeNames[model.name] = typeNames[model.name]                              // eslint-disable-line
        rootTypeNames[model.name].filter = extractModelFilterInputType(model.name)     // eslint-disable-line
        rootTypeNames[model.name].fields = model.fields                                // eslint-disable-line

    return model
  }
}


export function generateOutputTypes(typeNames : TypeNameMap) {
  function generateOutputType([key, types] : [string, TypeName]) {
    function generateType([name, type] : [string, SchemaEntry]) {
      const fallback = typeNames[`${key}-${name}`] && typeNames[`${key}-${name}`].output
      const parameters = (type instanceof SchemaType ? type.graphqlTypeParameters() : '')
      const output = type instanceof SchemaType ? type.graphqlType(typeNames, fallback) : fallback

      return `  ${name}${parameters}: ${output}`
    }

    return `type ${types.output} {
  _id: ID!
  ${`${Object.entries(types.schema).map(generateType).join('\n')}

${Object.entries(types.fields || {})
    .filter(([name, field]) => field.mode.includes(FieldMode.OUTPUT))
    .map(([name, field]) => ([name, field.type]))
    .map(generateType)
    .join('\n')
}`.trim()}
}

type ${types.output}Payload {
  recordId: ID
  record: ${types.output}
}

type ${types.output}PayloadMany {
  recordIds: [ID]
  records: [${types.output}]
}`
  }

  return Object.entries(typeNames)
    .filter(([key, types] : [string, TypeName]) => !!types.output)
    .map(generateOutputType)
    .join('\n\n')
}

export function generateInputTypes(typeNames : TypeNameMap) {
  function generateInputType([key, types] : [string, TypeName]) {
    function generateType([name, type] : [string, SchemaEntry]) {
      const fallback = typeNames[`${key}-${name}`] && typeNames[`${key}-${name}`].input
      const output = type instanceof SchemaType ? type.graphqlInputType(typeNames, fallback) : fallback

      return `  ${name}: ${output}`
    }

    return `input ${types.input} {
  ${`${Object.entries(types.schema).map(generateType).join('\n')}

${Object.entries(types.fields || {})
    .filter(([name, field]) => field.mode.includes(FieldMode.INPUT))
    .map(([name, field]) => ([name, field.type]))
    .map(generateType)
    .join('\n')
}`.trim()}
}

input ${types.input}WithID {
  _id: ID!
  ${`${Object.entries(types.schema).map(generateType).join('\n')}

${Object.entries(types.fields || {})
    .filter(([name, field]) => field.mode.includes(FieldMode.INPUT))
    .map(([name, field]) => ([name, field.type]))
    .map(generateType)
    .join('\n')
}`.trim()}
}`
  }

  return Object.entries(typeNames)
    .filter(([key, types] : [string, TypeName]) => !!types.input)
    .map(generateInputType)
    .join('\n\n')
}

export function generateFilterTypes(rootTypeNames : TypeNameMap, typeNames : TypeNameMap) {
  function generateFilterType([key, types] : [string, TypeName]) {
    function generateType([name, type] : [string, SchemaEntry]) {
      const fallback = typeNames[`${key}-${name}`] && typeNames[`${key}-${name}`].input
      const output = type instanceof SchemaType ? type.graphqlInputType(typeNames, fallback) : fallback

      return `  ${name}: ${output}`
    }

    return `input ${types.filter} {
  _id: ID
  _ids: [ID]
  
  ${`${Object.entries(types.schema).map(generateType).join('\n')}

${Object.entries(types.fields || {})
    .filter(([name, field]) => field.mode.includes(FieldMode.INPUT))
    .map(([name, field]) => ([name, field.type]))
    .map(generateType)
    .join('\n')
}`.trim()}
  
  _or: [${types.filter}]
  _and: [${types.filter}]
  _operators: [${types.filter}]
}`
  }

  return Object.entries(rootTypeNames)
    .map(generateFilterType)
    .join('\n\n')
}

export function generateQueryType(typeNames : TypeNameMap) {
  function generateRead([name, type] : [string, TypeName]) {
    return `  ${name}(filter: ${type.filter}): ${type.output}`
  }
  function generateReadMany([name, type] : [string, TypeName]) {
    return `  ${name}List(filter: ${type.filter}): [${type.output}]`
  }
  function generateCount([name, type] : [string, TypeName]) {
    return `  ${name}Count(filter: ${type.filter}): Int`
  }

  return `
type Query {
${Object.entries(typeNames).map(generateRead).join('\n')}

${Object.entries(typeNames).map(generateReadMany).join('\n')}

${Object.entries(typeNames).map(generateCount).join('\n')}
}
  `
}


export function generateMutationType(typeNames : TypeNameMap) {
  function generateCreate([name, type] : [string, TypeName]) {
    return `  ${name}Create(record: ${type.input}): ${type.output}Payload`
  }

  function generateCreateMany([name, type] : [string, TypeName]) {
    return `  ${name}CreateMany(records: [${type.input}]): ${type.output}PayloadMany`
  }

  function generateUpdate([name, type] : [string, TypeName]) {
    return `  ${name}Update(record: ${type.input}WithID): ${type.output}Payload`
  }

  function generateUpdateMany([name, type] : [string, TypeName]) {
    return `  ${name}UpdateMany(records: [${type.input}WithID]): ${type.output}PayloadMany`
  }

  function generateDelete([name, type] : [string, TypeName]) {
    return `  ${name}Delete(id: ID!): ${type.output}Payload`
  }

  function generateDeleteMany([name, type] : [string, TypeName]) {
    return `  ${name}DeleteMany(ids: [ID!]!): ${type.output}PayloadMany`
  }

  return `
type Mutation {
${Object.entries(typeNames).map(generateCreate).join('\n')}

${Object.entries(typeNames).map(generateCreateMany).join('\n')}

${Object.entries(typeNames).map(generateUpdate).join('\n')}

${Object.entries(typeNames).map(generateUpdateMany).join('\n')}

${Object.entries(typeNames).map(generateDelete).join('\n')}

${Object.entries(typeNames).map(generateDeleteMany).join('\n')}
}
  `
}
