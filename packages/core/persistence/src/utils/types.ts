import Voca from 'voca'

import { SchemaType } from '@harmonyjs/types-persistence'

export function extractModelType(name: string): string {
  return Voca.capitalize(Voca.camelCase(name))
}

type GraphqlPropArgs = {
  property: string,
  type: SchemaType,
  nested?: string,
  input?: boolean
  args?: {
    [key: string]: any
  }
}

export function printGraphqlProp({
  property,
  type,
  nested,
  input,
  args,
} : GraphqlPropArgs) {
  const propertyType = input ? type.graphqlInputType : type.graphqlType
  const required = type.isRequired ? '!' : ''
  const annotations = []

  const federation = type._federation || { external: false, provides: null }

  if (federation.external) {
    annotations.push('@external')
  }
  if (federation.provides) {
    annotations.push(`@provides(${federation.provides})`)
  }

  const argsString = `(${(args || []).map((prop) => printGraphqlProp(prop)).join(', ')})`

  return '{{property}}{{arguments}}: {{type}}{{required}} {{annotations}}'
    .replace('{{property}}', property)
    .replace('{{arguments}}', args ? argsString : '')
    .replace('{{type}}', propertyType)
    .replace('{{required}}', required)
    .replace('{{annotations}}', annotations.join(' '))
    .replace('{{nested}}', nested)
    .trim()
}

export function printGraphqlType({
  name,
  properties,
  external,
  root,
} : {
  name: string,
  properties: GraphqlPropArgs[],
  external?: boolean,
  root?: boolean,
}) {
  const annotations = []
  const id = external ? '_id: ID! @external' : '_id: ID!'

  if (root) {
    annotations.push('@key(fields: "_id")')
  }

  return '{{external}} type {{name}} {{annotations}} {\n  {{id}}\n  {{properties}}\n}'
    .replace('{{external}}', external ? 'extend' : '')
    .replace('{{name}}', name)
    .replace('{{id}}', root ? id : '')
    .replace('{{annotations}}', annotations.join(' '))
    .replace('{{properties}}', properties.map(printGraphqlProp).join('\n  '))
    .trim()
    .split('\n')
    .filter((l) => !!l.trim())
    .join('\n')
}

export function printGraphqlInputType({
  name, properties,
} : {
  name: string,
  properties: GraphqlPropArgs[]
}) {
  return 'input {{name}} {\n  {{properties}}\n}'
    .replace('{{name}}', name)
    .replace('{{properties}}', properties.map(printGraphqlProp).join('\n  '))
    .trim()
    .split('\n')
    .filter((l) => !!l.trim())
    .join('\n')
}
