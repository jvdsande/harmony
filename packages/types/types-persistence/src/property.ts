import { Schema } from 'model'

export type PropertyType =
  'string'
  | 'number'
  | 'float'
  | 'boolean'

  | 'json'
  | 'date'

//  | 'enum'
  | 'reference'
  | 'reversed-reference'
  | 'id'

//  | 'map'
  | 'array'

  | 'schema'
  | 'raw'

export enum PropertyMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export interface IPropertyBase {
  mode : PropertyMode[]

  name : string
  parent? : IProperty

  // Modifiers
  indexed : this
  unique : this
  required : this
  withArgs(args : Schema) : this
  withMode(mode : PropertyMode|PropertyMode[]) : this

  // Accessors
  isIndexed : boolean
  isUnique : boolean
  isRequired : boolean

  // Federation specific modifiers
  primary: this
  external: this
  provides(fields: string) : this
  requires(fields: string) : this

  // Federation specific accessors
  isPrimary : boolean
  isExternal : boolean
  doesProvide : string
  doesRequire : string

  // GraphQL helpers
  graphqlName : string
  graphqlAnnotations : string
  graphqlType : string
  graphqlInputType : string
  graphqlSchema : string
  graphqlInputSchema : string
  graphqlArgsSchema : string
  graphqlArgs : string
}

interface IPropertyPrimitive<T extends PropertyType> extends IPropertyBase {
  type: T
}

export interface IPropertyRaw extends IPropertyPrimitive<'raw'> {}
export interface IPropertyID extends IPropertyPrimitive<'id'> {}
export interface IPropertyString extends IPropertyPrimitive<'string'> {}
export interface IPropertyNumber extends IPropertyPrimitive<'number'> {}
export interface IPropertyFloat extends IPropertyPrimitive<'float'> {}
export interface IPropertyBoolean extends IPropertyPrimitive<'boolean'> {}
export interface IPropertyJSON extends IPropertyPrimitive<'json'> {}
export interface IPropertyDate extends IPropertyPrimitive<'date'> {}

export interface IPropertyReference extends IPropertyBase {
  type : 'reference'
  of : string
}

export interface IPropertyReversedReference extends IPropertyBase {
  type: 'reversed-reference'
  of : string
  on : string
}

export interface IPropertyArray extends IPropertyBase {
  type: 'array'
  of : IProperty
  deepOf : IProperty
}

export interface IPropertySchema extends IPropertyBase {
  type: 'schema',
  of : {
    [key: string] : IProperty
  }
}

export interface IPropertyUndiscriminated extends IPropertyBase {
  type: PropertyType,
  of: string | IProperty | {[key: string] : IProperty}
  on : string
  deepOf: IProperty
}

export type IProperty = (IPropertyString | IPropertyNumber | IPropertyFloat | IPropertyBoolean
  | IPropertyID | IPropertyJSON | IPropertyDate
  | IPropertyReference | IPropertyReversedReference | IPropertyArray | IPropertySchema
  | IPropertyRaw)
