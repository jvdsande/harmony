import Voca from 'voca'
import { FieldMode, FieldModeEnum } from './model'

function extractModelType(name: string): string {
  return Voca.capitalize(Voca.camelCase(name))
}

type TypeEnum =
  'string'
  | 'number'
  | 'float'
  | 'boolean'

  | 'json'
  | 'date'

  | 'enum'
  | 'reference'
  | 'id'

  | 'map'
  | 'array'

  | 'nested'
  | 'raw'

export type PropertySchema = {
  [key: string]: Property | PropertySchema | [Property] | [PropertySchema]
}

export type SanitizedPropertySchema = {
  [key: string]: Property,
}

export type PropertyOf = string | Property | SanitizedPropertySchema

// eslint-disable-next-line import/prefer-default-export
export class Property {
  toJSON() {
    const jsonObj = { ...this }

    delete jsonObj.parent

    const savedConfiguration = { ...jsonObj._configuration }
    const savedFederation = { ...jsonObj._federation }

    const excludeFields = ['deepOf', 'required', 'indexed', 'unique', 'primary', 'external']

    const proto = Object.getPrototypeOf(this)

    // eslint-disable-next-line no-restricted-syntax
    for (const key of Object.getOwnPropertyNames(proto)) {
      const desc = Object.getOwnPropertyDescriptor(proto, key)
      const hasGetter = desc && typeof desc.get === 'function'
      if (hasGetter && !excludeFields.includes(key) && this[key] !== this) {
        jsonObj[key] = this[key]
      }
    }

    this._configuration = savedConfiguration
    this._federation = savedFederation
    jsonObj._configuration = savedConfiguration
    jsonObj._federation = savedFederation

    return jsonObj
  }

  type: TypeEnum

  of: PropertyOf

  parent?: Property

  args?: SanitizedPropertySchema

  _configuration : {
    indexed: boolean,
    required: boolean,
    unique: boolean,
    mode?: FieldModeEnum[],
    name: string
  } = {
    indexed: false,
    required: false,
    unique: false,
    mode: null,
    name: '',
  }

  _federation = {
    primary: false,
    external: false,
    provides: null,
    requires: null,
  }

  constructor({ type, of = null, name = '' } : { type: TypeEnum, of?: PropertyOf, name?: string }) {
    this.type = type
    this.of = of
    this.name = name

    if (this.of instanceof Property) {
      this.of.parent = this
    }
  }

  get deepOf() {
    if (this.type === 'raw') {
      return null
    }
    if (this.of === null || typeof this.of === 'string') {
      return this.of
    }

    if (this.of instanceof Property) {
      if (this.of.type === 'array') {
        return this.of.deepOf
      }

      if (this.of.type === 'map') {
        return this.of.deepOf
      }

      return this.of
    }

    return null
  }

  get mode() {
    return this._configuration.mode || (this.parent && this.parent.mode) || []
  }

  set mode(mode : FieldModeEnum[] | null) {
    this._configuration.mode = mode
  }

  get name() {
    return (this.parent ? this.parent.name : '') + extractModelType(this._configuration.name)
  }

  set name(name) {
    this._configuration.name = name
  }

  // Modifiers
  withArgs(args) {
    this.args = args
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

  isIndexed() {
    return !!this._configuration.indexed || this.isUnique()
  }

  isRequired() {
    return !!this._configuration.required
  }

  isUnique() {
    return !!this._configuration.unique
  }

  // Federation specific modifiers
  get primary() {
    this._federation.primary = true
    return this
  }

  get external() {
    this._federation.external = true
    return this
  }

  provides(fields: string) {
    this._federation.provides = fields
    return this
  }

  requires(fields: string) {
    this._federation.requires = fields
    return this
  }

  get graphqlType() : string {
    const value = this.of instanceof Property ? this.of.graphqlType : this.of

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Number'
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
        return extractModelType(this.of as string)
      case 'map':
        return `[${value}]` // TODO Add EntryType
      case 'array':
        return `[${value}]`
      case 'nested':
        return this.name
      case 'raw':
        if (this.of instanceof Property) {
          return this.of.graphqlType
        }

        return this.of as string
      default:
        return ''
    }
  }

  get graphqlInputType() : string {
    const value = this.of instanceof Property ? this.of.graphqlInputType : this.of

    switch (this.type) {
      case 'string':
        return 'String'
      case 'number':
        return 'Number'
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
        return `${this.name}Input`
      case 'raw':
        if (this.of instanceof Property) {
          return this.of.graphqlInputType
        }

        return this.of as string
      default:
        return ''
    }
  }

  get graphqlArgs() {
    if (!this.args) {
      return ''
    }

    return `(${Object.values(this.args).map((arg) => `${arg.name}: ${arg.graphqlInputType}`).join(', ')})`
  }
}
