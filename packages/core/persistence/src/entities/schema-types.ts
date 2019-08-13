import { extractModelType } from '../utils/types'

export type SchemaEnum =
  'string'
  | 'enum'
  | 'number'
  | 'float'
  | 'boolean'
  | 'json'
  | 'date'
  | 'map'
  | 'array'
  | 'reference'
  | 'id'

  | 'nested'

export class SchemaType {
  _object = 'SchemaType'

  _federation = {
    primary: false,
    external: false,
    provides: null,
    requires: null,
  }

  _required = false

  type: SchemaEnum = 'string'

  of: any = null

  constructor(type: SchemaEnum, of?) {
    this.type = type
    this.of = of
  }

  provides(fields: string) {
    this._federation.provides = fields
    return this
  }

  requires(fields: string) {
    this._federation.requires = fields
    return this
  }

  get external() {
    this._federation.external = true
    return this
  }

  get primary() {
    this._federation.primary = true
    return this
  }

  get required() {
    this._required = true
    return this
  }

  get graphqlType() {
    const value = this.of instanceof SchemaType ? this.of.graphqlType : '{{nested}}'

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Int'
      case 'float':
        return 'Float'
      case 'boolean':
        return 'Boolean'
      case 'json':
        return 'JSON'
      case 'date':
        return 'Date'
      case 'id':
        return 'ID'
      case 'reference':
        return extractModelType(this.of)
      case 'map':
        return `[${value}]` // TODO Add EntryType
      case 'array':
        return `[${value}]`
      case 'nested':
        return '{{nested}}'
      default:
        return ''
    }
  }


  get graphqlInputType() {
    const value = this.of instanceof SchemaType ? this.of.graphqlInputType : '{{nested}}'

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Int'
      case 'float':
        return 'Float'
      case 'boolean':
        return 'Boolean'
      case 'json':
        return 'JSON'
      case 'date':
        return 'Date'
      case 'id':
        return 'ID'
      case 'reference':
        return 'ID'
      case 'map':
        return `[${value}]` // TODO Add EntryType
      case 'array':
        return `[${value}]`
      case 'nested':
        return '{{nested}}'
      default:
        return ''
    }
  }

  graphqlTypeParameters() {
    if (this.type === 'map') {
      return '(keys: [String])'
    }

    return ''
  }

  _graphqlType(typeNames, fallback) {
    const value = this.of instanceof SchemaType ? this.of._graphqlType(typeNames, fallback) : fallback

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Int'
      case 'float':
        return 'Float'
      case 'boolean':
        return 'Boolean'
      case 'json':
        return 'JSON'
      case 'date':
        return 'Date'
      case 'id':
        return 'ID'
      case 'reference':
        return `${typeNames[this.of].output}`
      case 'map':
        return `[${value}]` // TODO Add EntryType
      case 'array':
        return `[${value}]`
      default:
        return ''
    }
  }

  get graphqlPrimitiveType() {
    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Int'
      case 'float':
        return 'Float'
      case 'boolean':
        return 'Boolean'
      case 'json':
        return 'JSON'
      case 'date':
        return 'Date'
      case 'id':
        return 'ID'
      default:
        return ''
    }
  }

  _graphqlInputType(typeNames, fallback) {
    const value = this.of instanceof SchemaType ? this.of._graphqlInputType(typeNames, fallback) : fallback

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Int'
      case 'float':
        return 'Float'
      case 'boolean':
        return 'Boolean'
      case 'json':
        return 'JSON'
      case 'date':
        return 'Date'
      case 'id':
        return 'ID'
      case 'reference':
        return 'ID'
      case 'map':
        return `[${value}]` // TODO Add EntryType
      case 'array':
        return `[${value}]`
      default:
        return ''
    }
  }
}


class TypesClass {
  get String() {
    return new SchemaType('string')
  }

  get Number() {
    return new SchemaType('number')
  }

  get Float() {
    return new SchemaType('float')
  }

  get Boolean() {
    return new SchemaType('boolean')
  }

  get JSON() {
    return new SchemaType('json')
  }

  get Date() {
    return new SchemaType('date')
  }

  get Map() {
    return new SchemaType(
      'map',
      (type) => new SchemaType('map', type),
    )
  }

  get Array() {
    return new SchemaType(
      'array',
      (type) => new SchemaType('array', type),
    )
  }

  get ID() {
    return new SchemaType('id')
  }

  get Reference() {
    return new SchemaType('reference', (type) => new SchemaType('reference', type))
  }
}

const Types = new TypesClass()
export default Types
