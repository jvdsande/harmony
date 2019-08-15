import Voca from 'voca'

function extractModelType(name: string): string {
  return Voca.capitalize(Voca.camelCase(name))
}

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
  | 'raw'

// eslint-disable-next-line
export class SchemaType {
  _object = 'SchemaType'

  _federation = {
    primary: false,
    external: false,
    provides: null,
    requires: null,
  }

  _configuration = {
    indexed: false,
    required: false,
    unique: false,
  }

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

  get indexed() {
    this._configuration.indexed = true
    return this
  }

  get required() {
    this._configuration.required = true
    return this
  }

  get unique() {
    this._configuration.unique = true
    return this
  }

  get isIndexed() {
    return this._configuration.indexed
  }

  get isRequired() {
    return this._configuration.required
  }

  get isUnique() {
    return this._configuration.unique
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
      case 'raw':
        return this.of
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
      case 'raw':
        return this.of
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
