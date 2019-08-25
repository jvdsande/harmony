import Voca from 'voca'

import {
  Field, FieldMode, Property, SanitizedModel, PropertySchema,
} from '@harmonyjs/types-persistence'
import Types from '../entities/schema-types'

export function extractModelType(name: string): string {
  return Voca.capitalize(Voca.camelCase(name))
}

type Operator = {
  name: string
  type: 'inherit' | Property
}

const genericOperators : Operator[] = [
  { name: 'eq', type: 'inherit' },
  { name: 'neq', type: 'inherit' },
  { name: 'exists', type: Types.Boolean },
  { name: 'in', type: Types.Array.of('inherit') },
  { name: 'nin', type: Types.Array.of('inherit') },
]

const numberOperators : Operator[] = [
  { name: 'gte', type: 'inherit' },
  { name: 'lte', type: 'inherit' },
  { name: 'gt', type: 'inherit' },
  { name: 'lt', type: 'inherit' },
]

const stringOperators : Operator[] = [
  { name: 'regex', type: Types.String },
]

const arrayOperators : Operator[] = [
  { name: 'element', type: 'inherit' },
]


export function printGraphqlProp({ property, input = false } : { property: Property, input?: boolean }) {
  const propertyType = input ? property.graphqlInputType : property.graphqlType
  const required = property.isRequired() ? '!' : ''
  const annotations = []

  const federation = property._federation || { external: false, provides: null }

  if (federation.external) {
    annotations.push('@external')
  }
  if (federation.provides) {
    annotations.push(`@provides(${federation.provides})`)
  }

  const argsString = `(${Object.values(property.args || {})
    .map((prop : Property) => printGraphqlProp({ property: prop, input: true })).join(', ')})`

  return '{{property}}{{arguments}}: {{type}}{{required}} {{annotations}}'
    .replace('{{property}}', property._configuration.name)
    .replace('{{arguments}}', (!input && property.args) ? argsString : '')
    .replace('{{type}}', propertyType)
    .replace('{{required}}', required)
    .replace('{{annotations}}', annotations.join(' '))
    .trim()
}

export function printGraphqlType({
  name,
  properties,
  external,
  root,
} : {
  name: string,
  properties: Property[],
  external?: boolean,
  root?: boolean,
}) {
  const annotations = []
  const id = external ? '_id: ID @external' : '_id: ID'

  if (root) {
    annotations.push('@key(fields: "_id")')
  }

  return '{{external}} type {{name}} {{annotations}} {\n  {{id}}\n  {{properties}}\n}'
    .replace('{{external}}', external ? 'extend' : '')
    .replace('{{name}}', name)
    .replace('{{id}}', root ? id : '')
    .replace('{{annotations}}', annotations.join(' '))
    .replace('{{properties}}', properties.map((property) => printGraphqlProp({ property })).join('\n  '))
    .trim()
    .split('\n')
    .filter((l) => !!l.trim())
    .join('\n')
}

export function printGraphqlInputType({
  name, properties,
} : {
  name: string,
  properties: Property[]
}) {
  return 'input {{name}} {\n  {{properties}}\n}'
    .replace('{{name}}', name)
    .replace('{{properties}}', properties.map((property) => printGraphqlProp({ property, input: true })).join('\n  '))
    .trim()
    .split('\n')
    .filter((l) => !!l.trim())
    .join('\n')
}


function extractNestedProperty(schema: Property) {
  return Object.values(schema.of)
    .filter((prop) => {
      const propIsNested = prop.type === 'nested'
      const deepIsNested = !!prop.deepOf && prop.deepOf.type === 'nested'

      return propIsNested || deepIsNested
    })
    .map((prop) => (prop.type === 'nested' ? prop : prop.deepOf))
}


function extractNestedArguments(schema: Property) {
  return Object.values(schema.of)
    .filter((q) => !!q.args)
    .flatMap((q) => {
      const argType = new Property({ type: 'nested', of: q.args })

      return extractNestedProperty(argType)
    })
}


function printGraphqlNested(property : Property) {
  return [
    ...extractNestedProperty(property)
      .map(printGraphqlNested),
    property.mode.includes(FieldMode.OUTPUT) ? printGraphqlType({
      name: property.graphqlType,
      properties: Object.values(property.of).filter((prop) => prop.mode.includes(FieldMode.OUTPUT)),
    }) : '',
    property.mode.includes(FieldMode.INPUT) ? printGraphqlInputType({
      name: property.graphqlInputType,
      properties: Object.values(property.of).filter((prop) => prop.mode.includes(FieldMode.INPUT)),
    }) : '',

    // TODO: Print Args Type
  ].join('\n')
}

function makeOperatorProperty({ key, property, array = false } : { key: string, property: Property, array?: boolean}) {
  if (property.type === 'nested') {
    const of : PropertySchema = {}
    const nested = new Property({ name: key, type: 'nested', of })

    const nestedOperator = new Property({ name: 'match', type: 'nested', of: {} })

    Object.keys(property.of)
      .forEach((k) => {
        nestedOperator.of[k] = makeOperatorProperty({ key: k, property: property.of[k] })
        nestedOperator.of[k].parent = nestedOperator
      })

    nestedOperator.parent = nested
    of.match = nestedOperator

    return nested
  }

  if (property.type === 'array') {
    const nestedProperty = makeOperatorProperty({ key: 'array', property: property.of as Property, array: true })

    const arrayNested = new Property({ name: key, type: 'nested', of: {} })

    arrayOperators.forEach((operator) => {
      const operatorType = operator.type === 'inherit' ? nestedProperty : new Property({ type: operator.type.type })

      if (operatorType.type === 'array') {
        operatorType.of = new Property({ type: 'raw' })
        operatorType.of.of = nestedProperty
      }

      operatorType.name = operator.name
      operatorType.parent = arrayNested

      arrayNested.of[operator.name] = operatorType
    })

    return arrayNested
  }

  const prop = new Property({ name: key, type: 'nested', of: {} })
  const { type } = property

  const operators = [...genericOperators]

  if (
    ['number', 'float', 'id', 'reference', 'date'].includes(type as string)
  ) {
    operators.push(...numberOperators)
  }

  if (['string'].includes(type as string)) {
    operators.push(...stringOperators)
  }

  operators.forEach((operator) => {
    const operatorType = new Property({ type: operator.type === 'inherit' ? type : operator.type.type })

    if (operatorType.type === 'array') {
      operatorType.of = new Property({ type })
    }

    operatorType.name = operator.name
    operatorType.parent = prop

    prop.of[operator.name] = operatorType
  })

  return prop
}

function makeOperatorType(model : SanitizedModel) {
  const operator = new Property({
    type: 'nested',
    name: `${model.name}Operator`,
    of: {},
  })

  Object.keys(model.schema.of)
    .forEach((key) => {
      const property = model.schema.of[key]
      operator.of[key] = makeOperatorProperty({ key, property })
      operator.of[key].parent = operator
    })

  operator.mode = [FieldMode.INPUT]

  return operator
}

export function printGraphqlRoot(model : SanitizedModel) {
  const operatorType = makeOperatorType(model)

  const { graphqlType, graphqlInputType } = model.schema

  const nestedTypes = extractNestedProperty(model.schema)
    .map(printGraphqlNested)

  const nestedArgs = extractNestedArguments(model.schema)
    .map(printGraphqlNested)

  const outputType = printGraphqlType({
    name: graphqlType,
    properties: Object.values(model.schema.of).filter((prop) => prop.mode.includes(FieldMode.OUTPUT)),
    root: true,
    external: model.external,
  })

  const payloadType = printGraphqlType({
    name: `${graphqlType}Payload`,
    properties: [
      new Property({ type: 'raw', name: 'record', of: model.schema.graphqlType }),
      new Property({ type: 'id', name: 'recordId' }),
    ],
  })

  const payloadManyType = printGraphqlType({
    name: `${graphqlType}PayloadMany`,
    properties: [
      new Property({
        type: 'array',
        name: 'records',
        of: new Property({ type: 'raw', of: graphqlType }),
      }),
      new Property({
        type: 'array',
        name: 'recordIds',
        of: new Property({ type: 'id' }),
      }),
    ],
  })

  const inputType = printGraphqlInputType({
    name: graphqlInputType,
    properties: Object.values(model.schema.of).filter((prop) => prop.mode.includes(FieldMode.INPUT)),
  })

  const inputWithIdType = printGraphqlInputType({
    name: `${graphqlInputType}WithID`,
    properties: [
      new Property({ type: 'id', name: '_id' }).required,
      ...Object.values(model.schema.of).filter((prop) => prop.mode.includes(FieldMode.INPUT)),
    ],
  })

  const filterType = printGraphqlInputType({
    name: `${graphqlInputType}Filter`,
    properties: [

      new Property({ type: 'id', name: '_id' }),
      ...Object.values(model.schema.of).filter((prop) => prop.mode.includes(FieldMode.INPUT)),
      new Property({
        type: 'array', name: '_or', of: new Property({ type: 'raw', of: `${graphqlInputType}Filter` }),
      }),
      new Property({
        type: 'array', name: '_and', of: new Property({ type: 'raw', of: `${graphqlInputType}Filter` }),
      }),
      new Property({
        type: 'array', name: '_nor', of: new Property({ type: 'raw', of: `${graphqlInputType}Filter` }),
      }),
      new Property({
        type: 'raw', name: '_operators', of: operatorType,
      }),
    ],
  })

  const operatorNestedType = printGraphqlNested(operatorType)

  const root = [
    nestedTypes,
    nestedArgs,
    outputType,
  ]

  if (!model.external) {
    root.push(...[
      payloadType,
      payloadManyType,
      inputType,
      inputWithIdType,
      filterType,
      operatorNestedType,
    ])
  }

  return root.join('\n')
}

function printGraphqlQuery(query : Field) {
  return [
    printGraphqlProp({
      property: query.type as Property,
    }),
  ]
}

export function printGraphqlQueries(model : SanitizedModel) {
  const types = Object.entries(model.fields.queries)
    .map(([name, q]) => {
      const type = q.type as Property

      if (type.type === 'nested') {
        return printGraphqlNested(type)
      }

      return ''
    })

  const args = Object.entries(model.fields.queries)
    .filter(([name, q]) => !!q.args)
    .map(([name, q]) => {
      const argType = new Property({ type: 'nested', of: q.args })

      return extractNestedProperty(argType)
        .map(printGraphqlNested)
        .join('\n')
    })

  const query = Object.values(model.fields.queries).length ? 'extend type Query {\n  {queries}\n}'
    .replace('{queries}', Object.values(model.fields.queries)
      .map(printGraphqlQuery).join('\n  ')) : ''

  return [
    ...types,
    ...args,
    query,
  ].join('\n')
}


function printGraphqlMutation(mutation : Field) {
  return [
    printGraphqlProp({
      property: mutation.type as Property,
    }),
  ]
}

export function printGraphqlMutations(model : SanitizedModel) {
  const types = Object.entries(model.fields.mutations)
    .map(([name, q]) => {
      const type = q.type as Property

      if (type.type === 'nested') {
        return printGraphqlNested(type)
      }

      return ''
    })

  const args = Object.entries(model.fields.mutations)
    .filter(([name, q]) => !!q.args)
    .map(([name, q]) => {
      const argType = new Property({ type: 'nested', of: q.args })

      return extractNestedProperty(argType)
        .map(printGraphqlNested)
        .join('\n')
    })

  const mutation = Object.values(model.fields.mutations).length ? 'extend type Mutation {\n  {mutations}\n}'
    .replace('{mutations}', Object.values(model.fields.mutations)
      .map(printGraphqlMutation).join('\n  ')) : ''

  return [
    ...types,
    ...args,
    mutation,
  ].join('\n')
}
