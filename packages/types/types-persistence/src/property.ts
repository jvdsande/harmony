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
  required : this|IPropertyBase
  withArgs(args : Schema|IPropertySchema) : this
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

interface IPropertyPrimitive<
  T extends PropertyType,
  R extends IPropertyBase,
  R1 extends boolean,
  U
> extends IPropertyBase {
  type: T
  required: R
  isRequired: R1
  valueType?: U
  valueInput?: U
}

export interface IPropertyRaw extends IPropertyPrimitive<'raw', IPropertyRawRequired, false, string> {}
export interface IPropertyRawRequired extends IPropertyPrimitive<'raw', IPropertyRawRequired, true, string> {}

export interface IPropertyID extends IPropertyPrimitive<'id', IPropertyIDRequired, false, string> {}
export interface IPropertyIDRequired extends IPropertyPrimitive<'id', IPropertyIDRequired, true, string> {}

export interface IPropertyString extends IPropertyPrimitive<
  'string', IPropertyStringRequired, false, string
> {}
export interface IPropertyStringRequired extends IPropertyPrimitive<
  'string', IPropertyStringRequired, true, string
> {}

export interface IPropertyNumber extends IPropertyPrimitive<
  'number', IPropertyNumberRequired, false, number
> {}
export interface IPropertyNumberRequired extends IPropertyPrimitive<
  'number', IPropertyNumberRequired, true, number
> {}

export interface IPropertyFloat extends IPropertyPrimitive<
  'float', IPropertyFloatRequired, false, number
> {}
export interface IPropertyFloatRequired extends IPropertyPrimitive<
  'float', IPropertyFloatRequired, true, number
> {}

export interface IPropertyBoolean extends IPropertyPrimitive<
  'boolean', IPropertyBooleanRequired, false, boolean
> {}
export interface IPropertyBooleanRequired extends IPropertyPrimitive<
  'boolean', IPropertyBooleanRequired, true, boolean
> {}

export interface IPropertyJSON extends IPropertyPrimitive<
  'json', IPropertyJSONRequired, false, {[key: string]: any}
> {}
export interface IPropertyJSONRequired extends IPropertyPrimitive<
  'json', IPropertyJSONRequired, true, {[key: string]: any}
> {}

export interface IPropertyDate extends IPropertyPrimitive<'date', IPropertyDateRequired, false, Date> {}
export interface IPropertyDateRequired extends IPropertyPrimitive<'date', IPropertyDateRequired, true, Date> {}


interface IPropertyReferenceBase<T extends Schema> extends IPropertyBase {
  type : 'reference'
  of : string
  required: IPropertyReferenceRequired<T>
  valueType?: SchemaOutputType<T>|string
  valueInput?: string
}
export interface IPropertyReference<T extends Schema = any> extends IPropertyReferenceBase<T> {
  isRequired: false
}
export interface IPropertyReferenceRequired<T extends Schema = any> extends IPropertyReferenceBase<T> {
  isRequired: true
}

interface IPropertyReversedReferenceBase<T extends Schema> extends IPropertyBase {
  type : 'reversed-reference'
  of : string
  on : string
  required: IPropertyReversedReferenceRequired<T>
  valueType?: SchemaOutputType<T>|string
  valueInput?: string
}
export interface IPropertyReversedReference<T extends Schema = any> extends IPropertyReversedReferenceBase<T> {
  isRequired: false
}
export interface IPropertyReversedReferenceRequired<T extends Schema = any> extends IPropertyReversedReferenceBase<T> {
  isRequired: true
}

export interface IPropertyArrayBase<T extends SchemaField> extends IPropertyBase {
  type: 'array'
  of : IProperty
  deepOf : IProperty
  required: IPropertyArrayRequired<T>
  valueType?: (T extends Schema ? SchemaOutputType<T> : PropertyOutputType<T>)[]
  valueInput?: (T extends Schema ? SchemaInputType<T> : PropertyInputType<T>)[]
}
export interface IPropertyArray<T extends SchemaField = any> extends IPropertyArrayBase<T> {
  isRequired: false
}
export interface IPropertyArrayRequired<T extends SchemaField = any> extends IPropertyArrayBase<T> {
  isRequired: true
}

export interface IPropertySchemaBase<T extends Schema> extends IPropertyBase {
  type: 'schema',
  of : {
    [key: string] : IProperty
  }
  required: IPropertySchemaRequired<T>
  valueType?: SchemaOutputType<T>
  valueInput?: SchemaInputType<T>
}
export interface IPropertySchema<T extends Schema = {[key: string]: IProperty}> extends IPropertySchemaBase<T> {
  isRequired: false
}
export interface IPropertySchemaRequired<T extends Schema = {[key: string]: IProperty}> extends IPropertySchemaBase<T> {
  isRequired: true
}

export interface IPropertyUndiscriminated extends IPropertyBase {
  type: PropertyType,
  of: string | IProperty | {[key: string] : IProperty}
  on : string
  deepOf: IProperty
}

export type IPropertyRequired = (IPropertyStringRequired | IPropertyNumberRequired | IPropertyFloatRequired
  | IPropertyBooleanRequired | IPropertyIDRequired | IPropertyJSONRequired | IPropertyDateRequired
  | IPropertyReferenceRequired | IPropertyReversedReferenceRequired | IPropertyArrayRequired
  | IPropertySchemaRequired | IPropertyRawRequired)

export type IProperty = IPropertyRequired | (IPropertyString | IPropertyNumber | IPropertyFloat | IPropertyBoolean
  | IPropertyID | IPropertyJSON | IPropertyDate
  | IPropertyReference | IPropertyReversedReference | IPropertyArray | IPropertySchema
  | IPropertyRaw)


export type SchemaOutputType<T extends Schema> = {
  [P in (keyof T)]: PropertyOutputType<T[P]>
}

export type PropertyOutputType<P extends SchemaField> =
  P extends IPropertyRequired ? Required<P>['valueType'] :
  P extends IProperty ? P['valueType'] :
  P extends Array<SchemaField> ? PropertyOutputType<P[0]>[] :
  P extends Schema ? SchemaOutputType<P> : undefined

export type SchemaInputType<T extends Schema> = {
  [P in (keyof T)]: PropertyInputType<T[P]>
}

export type PropertyInputType<P extends SchemaField> =
  P extends IPropertyRequired ? Required<P>['valueInput'] :
  P extends IProperty ? P['valueInput'] :
  P extends Array<SchemaField> ? PropertyInputType<P[0]>[]|undefined :
  P extends Schema ? SchemaInputType<P>|undefined : undefined

// TODO: Definitely type SchemaOperatorType
export type SchemaOperatorType<T extends Schema> = {
  [P in (keyof T)]: any
}


export type SchemaField = IProperty | Schema | SchemaField[]
export type Schema = {
  [field: string]: SchemaField
}
