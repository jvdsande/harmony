export type SchemaEnum = 'string'|'enum'|'number'|'float'|'boolean'|'json'|'date'|'map'|'array'|'reference'|'id'

export class SchemaType {
    _object = 'SchemaType'

    type : SchemaEnum|SchemaType = 'string'

    of: any = null

    constructor(type: SchemaEnum, of?) {
      this.type = type
      this.of = of
    }

    graphqlTypeParameters() {
      if (this.type === 'map') {
        return '(keys: [String])'
      }

      return ''
    }

    graphqlType(typeNames, fallback) {
      const value = this.of instanceof SchemaType ? this.of.graphqlType(typeNames, fallback) : fallback

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

    graphqlInputType(typeNames, fallback) {
      const value = this.of instanceof SchemaType ? this.of.graphqlInputType(typeNames, fallback) : fallback

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

export const String : SchemaType = new SchemaType('string')
export const Number : SchemaType = new SchemaType('number')
export const Float : SchemaType = new SchemaType('float')
export const Boolean : SchemaType = new SchemaType('boolean')

export const JSON : SchemaType = new SchemaType('json')
export const Date : SchemaType = new SchemaType('date')

export const Map : SchemaType = new SchemaType(
  'map',
  type => new SchemaType('map', type),
)

export const Array : SchemaType = new SchemaType(
  'array',
  type => new SchemaType('array', type),
)

export const ID : SchemaType = new SchemaType('id')
export const Reference: SchemaType = new SchemaType('reference', type => new SchemaType('reference', type))

export default ({
  String,
  Number,
  Float,
  Boolean,
  JSON,
  Date,
  Map,
  Array,
  ID,
  Reference,
})
