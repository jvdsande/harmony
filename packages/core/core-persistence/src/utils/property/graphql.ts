import {
  IProperty, IPropertySchema, PropertyMode, PropertyType,
} from '@harmonyjs/types-persistence'
import { PropertyConfiguration } from 'utils/property/type'

import { extractModelName } from 'utils/property/utils'

// Get the GraphQL type name of a Property
export function computeGraphQLName({
  name, parent,
} : {
  name: string, parent?: IProperty
}) : string {
  return (parent ? computeGraphQLName({ name: parent.name, parent: parent.parent }) : '') + extractModelName(name)
}

// Get the GraphQL annotations for a Property
export function computeGraphQLAnnotations({
  configuration,
} : {
  configuration: PropertyConfiguration,
}) : string {
  return ([
    '',
    configuration.external ? '@external' : '',
    configuration.provides.length ? `@provides(fields: "${configuration.provides.join(' ')}")` : '',
    configuration.requires.length ? `@requires(fields: "${configuration.requires.join(' ')}")` : '',
  ]).join(' ')
}

// Extract the GraphQL type of a Property, either output or input type
const commonTypeTransform = (of: string) => ({
  raw: () => of,
  scalar: () => of,
  string: () => 'String',
  number: () => 'Number',
  float: () => 'Float',
  boolean: () => 'Boolean',
  json: () => 'JSON',
  date: () => 'Date',
})

// Get the output type of a Property
export function computeGraphQLType({
  type, configuration, of, name, isFor,
} : {
  type: PropertyType, configuration: PropertyConfiguration,
  of?: IProperty|{[key: string]: IProperty}|string
  name?: string,
  isFor?: string,
}) {
  const graphqlType : string = {
    ...commonTypeTransform(of as string),
    'id': () => `${extractModelName(isFor as string)}ID`,
    'reference': () => extractModelName(of as string),
    'reversed-reference': () => extractModelName(of as string),
    'schema': () => name!,
    'array': () => `[${(of as IProperty).graphqlType}]`,
    'untyped': () => 'string',
  }[type]()

  return graphqlType + (configuration.required ? '!' : '')
}

// Get the input type of a Property
export function computeGraphQLInputType({
  type, configuration, of, name, isFor,
} : {
  type: PropertyType, configuration: PropertyConfiguration,
  of?: IProperty|{[key: string]: IProperty}|string
  name?: string,
  isFor?: string,
}) {
  const graphqlType : string = {
    ...commonTypeTransform(of as string),
    'id': () => `${extractModelName(isFor as string)}ID`,
    'reference': () => `${extractModelName(isFor as string)}ID`,
    'reversed-reference': () => `${extractModelName(isFor as string)}ID`,
    'schema': () => `${name!}Input`,
    'array': () => `[${(of as IProperty).graphqlInputType}]`,
    'untyped': () => 'string',
  }[type]()

  return graphqlType + (configuration.required ? '!' : '')
}

// Get the GraphQL schema of a Property schema, extracting nested schemas if any
export function computeGraphQLSchema({
  schema, name,
} : {
  schema: {[key: string]: IProperty}, name: string,
}) {
  const keySchemas = Object.keys(schema).map((k) => `${schema[k].graphqlSchema}`).join('\n')
  const argsSchemas = Object.keys(schema).map((k) => `${schema[k].graphqlArgsSchema}`).join('\n')

  const mainSchema = Object.keys(schema).length > 0 ? `type ${name} {
${Object.keys(schema)
    .filter((k) => schema[k].mode.includes(PropertyMode.OUTPUT) || schema[k].mode.length < 1)
    .map((k) => `  ${k}${schema[k].graphqlArgs}: ${schema[k].graphqlType}${schema[k].graphqlAnnotations}`)
    .join('\n')
}
}` : ''

  const schemas = name ? [keySchemas, argsSchemas, mainSchema] : [keySchemas, mainSchema]

  return schemas.join('\n').replace(/\n+/g, '\n')
}

// Get the GraphQL schema of a Property schema, as an input type, extracting nested schemas if any
export function computeGraphQLInputSchema({
  schema, name,
} : {
  schema: {[key: string]: IProperty}, name: string,
}) {
  const keySchemas = Object.keys(schema).map((k) => `${schema[k].graphqlInputSchema}`).join('\n')

  // Do not print args for input/output elements, since they are already printed by the output
  const argsSchemas = Object.keys(schema)
    .filter((k) => !schema[k].mode.includes(PropertyMode.OUTPUT))
    .map((k) => `${schema[k].graphqlArgsSchema}`).join('\n')

  const mainSchema = Object.keys(schema).length > 0 ? `input ${name}Input {
${Object.keys(schema)
    .filter((k) => schema[k].mode.includes(PropertyMode.INPUT) || schema[k].mode.length < 1)
    .map((k) => `  ${k}: ${schema[k].graphqlInputType}`).join('\n')}
}`.replace(/\n+/g, '\n') : ''

  const schemas = name ? [keySchemas, argsSchemas, mainSchema] : [keySchemas, mainSchema]

  return schemas.join('\n').replace(/\n+/g, '\n')
}

// Get the GraphQL schema of a Property args, as an input type, extracting nested schemas if any
export function computeGraphQLArgsSchema({
  schema,
} : {
  schema: {[key: string]: IProperty},
}) {
  const keySchemas = Object.keys(schema).map((k) => `${schema[k].graphqlInputSchema}`).join('\n')

  return keySchemas.replace(/\n+/g, '\n')
}

// Get the argument part of a type
export function computeGraphQLArgs({
  args,
} : {
  args: IPropertySchema
}) {
  return `(${Object.keys(args.of).map((k) => `${k}: ${args.of[k].graphqlInputType}`).join(', ')})`
}
