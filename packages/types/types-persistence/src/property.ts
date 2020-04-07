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

  | 'scalar'
  | 'untyped'

export enum PropertyMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

export interface IPropertyBase {
  mode: PropertyMode[]

  name: string
  parent?: IProperty

  // Modifiers
  indexed: this
  unique: this
  required: this | IPropertyBase

  withArgs(args: Schema | IPropertySchema): this

  withMode(mode: PropertyMode | PropertyMode[]): this

  // Accessors
  isIndexed: boolean
  isUnique: boolean
  isRequired: boolean

  // Federation specific modifiers
  primary: this
  external: this

  provides(fields: string): this

  requires(fields: string): this

  // Federation specific accessors
  isPrimary: boolean
  isExternal: boolean
  doesProvide: string
  doesRequire: string

  // GraphQL helpers
  graphqlName: string
  graphqlAnnotations: string
  graphqlType: string
  graphqlInputType: string
  graphqlSchema: string
  graphqlInputSchema: string
  graphqlArgsSchema: string
  graphqlArgs: string
}

export interface StringSerializable {
  toString(): string
}

interface IPropertyRawBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'raw'
  required: IPropertyRawRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyRawRequired<O1, I1> : IPropertyRaw<O1, I1>
}
export interface IPropertyRaw<O = string, I = string> extends IPropertyRawBase<O, I, false> {}
export interface IPropertyRawRequired<O = string, I = string> extends IPropertyRawBase<O, I, true> {}


interface IPropertyIDBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'id'
  required: IPropertyIDRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyIDRequired<O1, I1> : IPropertyID<O1, I1>
}
export interface IPropertyID<O = string|StringSerializable, I = string> extends IPropertyIDBase<O, I, false> {
  for(adapter: string): this
  isFor: string
}
export interface IPropertyIDRequired<O = string|StringSerializable, I = string> extends IPropertyIDBase<O, I, true> {
  for(adapter: string): this
  isFor: string
}


interface IPropertyStringBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'string'
  required: IPropertyStringRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyStringRequired<O1, I1> : IPropertyString<O1, I1>
}
export interface IPropertyString<O = string, I = string> extends IPropertyStringBase<O, I, false> {}
export interface IPropertyStringRequired<O = string, I = string> extends IPropertyStringBase<O, I, true> {}


interface IPropertyNumberBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'number'
  required: IPropertyNumberRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyNumberRequired<O1, I1> : IPropertyNumber<O1, I1>
}
export interface IPropertyNumber<O = number, I = number> extends IPropertyNumberBase<O, I, false> {}
export interface IPropertyNumberRequired<O = number, I = number> extends IPropertyNumberBase<O, I, true> {}


interface IPropertyFloatBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'float'
  required: IPropertyFloatRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyFloatRequired<O1, I1> : IPropertyFloat<O1, I1>
}
export interface IPropertyFloat<O = number, I = number> extends IPropertyFloatBase<O, I, false> {}
export interface IPropertyFloatRequired<O = number, I = number> extends IPropertyFloatBase<O, I, true> {}


interface IPropertyBooleanBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'boolean'
  required: IPropertyBooleanRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyBooleanRequired<O1, I1> : IPropertyBoolean<O1, I1>
}
export interface IPropertyBoolean<O = boolean, I = boolean> extends IPropertyBooleanBase<O, I, false> {}
export interface IPropertyBooleanRequired<O = boolean, I = boolean> extends IPropertyBooleanBase<O, I, true> {}


interface IPropertyJSONBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'json'
  required: IPropertyJSONRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyJSONRequired<O1, I1> : IPropertyJSON<O1, I1>
}
export interface IPropertyJSON<O = any, I = any> extends IPropertyJSONBase<O, I, false> {}
export interface IPropertyJSONRequired<O = any, I = any> extends IPropertyJSONBase<O, I, true> {}


interface IPropertyDateBase<O, I, R extends boolean> extends IPropertyBase {
  type: 'date'
  required: IPropertyDateRequired<O, I>
  isRequired: R
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R ? IPropertyDateRequired<O1, I1> : IPropertyDate<O1, I1>
}
export interface IPropertyDate<O = Date, I = Date> extends IPropertyDateBase<O, I, false> {}
export interface IPropertyDateRequired<O = Date, I = Date> extends IPropertyDateBase<O, I, true> {}


interface IPropertyReferenceBase<T extends Schema,
  O,
  I,
  R extends boolean,
  > extends IPropertyBase {
  type: 'reference'
  of: string
  for(adapter: string): this
  isFor: string
  isRequired: R,
  required: IPropertyReferenceRequired<T, O, I>
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R
                    ? IPropertyReferenceRequired<T, O1, I1>
                    : IPropertyReference<T, O1, I1>
}

export interface IPropertyReference<T extends Schema = any,
  O = SchemaOutputType<T> | string,
  I = string,
  > extends IPropertyReferenceBase<T, O, I, false> {
}

export interface IPropertyReferenceRequired<T extends Schema = any,
  O = SchemaOutputType<T> | string,
  I = string,
  > extends IPropertyReferenceBase<T, O, I, true> {
}

interface IPropertyReversedReferenceBase<T extends Schema,
  O,
  I,
  R extends boolean,
  > extends IPropertyBase {
  type: 'reversed-reference'
  of: string
  on: string
  for(adapter: string): this
  isFor: string
  isRequired: R,
  required: IPropertyReversedReferenceRequired<T, O, I>
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R
                    ? IPropertyReversedReferenceRequired<T, O1, I1>
                    : IPropertyReversedReference<T, O1, I1>
}

export interface IPropertyReversedReference<T extends Schema = any,
  O = SchemaOutputType<T> | string,
  I = string> extends IPropertyReversedReferenceBase<T, O, I, false> {
}

export interface IPropertyReversedReferenceRequired<T extends Schema = any,
  O = SchemaOutputType<T> | string,
  I = string> extends IPropertyReversedReferenceBase<T, O, I, true> {
}

export interface IPropertyArrayBase<T extends SchemaField,
  O,
  I,
  R extends boolean,
  > extends IPropertyBase {
  type: 'array'
  of: IProperty
  deepOf: IProperty
  isRequired: R
  required: IPropertyArrayRequired<T, O, I>
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R
                    ? IPropertyArrayRequired<T, O1, I1>
                    : IPropertyArray<T, O1, I1>
}

export interface IPropertyArray<T extends SchemaField = any,
  O = (T extends Schema ? SchemaOutputType<T> : PropertyOutputType<T>)[],
  I = (T extends Schema ? SchemaInputType<T> : PropertyInputType<T>)[],
  > extends IPropertyArrayBase<T, O, I, false> {
}

export interface IPropertyArrayRequired<T extends SchemaField = any,
  O = (T extends Schema ? SchemaOutputType<T> : PropertyOutputType<T>)[],
  I = (T extends Schema ? SchemaInputType<T> : PropertyInputType<T>)[],
  > extends IPropertyArrayBase<T, O, I, true> {
}

export interface IPropertySchemaBase<T extends Schema,
  O,
  I,
  R extends boolean> extends IPropertyBase {
  type: 'schema',
  of: {
    [key: string]: IProperty
  }
  isRequired: R
  required: IPropertySchemaRequired<T, O, I>
  valueType?: O
  valueInput?: I

  as<O1, I1 = I>(): true extends R
                    ? IPropertySchemaRequired<T, O1, I1>
                    : IPropertySchema<T, O1, I1>
}

export interface IPropertySchema<T extends Schema = { [key: string]: IProperty },
  O = SchemaOutputType<T>,
  I = SchemaInputType<T>,
  > extends IPropertySchemaBase<T, O, I, false> {
}

export interface IPropertySchemaRequired<T extends Schema = { [key: string]: IProperty },
  O = SchemaOutputType<T>,
  I = SchemaInputType<T>,
  > extends IPropertySchemaBase<T, O, I, true> {
}

export interface IPropertyScalarBase<O,
  I,
  R extends boolean
  > extends IPropertyBase {
  type: 'scalar',
  isRequired: R
  required: IPropertyScalarRequired<O, I>;
  valueType?: O,
  valueInput?: I,

  as<O1, I1 = I>(): true extends R ? IPropertyScalarRequired<O1, I1> : IPropertyScalar<O1, I1>
}

export interface IPropertyScalar<O = any, I = any> extends IPropertyScalarBase<O, I, false> {
}

export interface IPropertyScalarRequired<O = any, I = any> extends IPropertyScalarBase<O, I, true> {
}

export interface IPropertyUndiscriminated extends IPropertyBase {
  __configuration: {
    indexed: boolean,
    unique: boolean,
    required: boolean,
    args?: IPropertySchema,

    // federation
    primary: boolean,
    external: boolean,
    provides: string[],
    requires: string[],
  }

  type: PropertyType,
  of: string | IProperty | { [key: string]: IProperty }
  on: string
  for(adapter: string): this
  isFor: string

  as<O, I = O>(): IProperty

  deepOf: IProperty
}

export type IPropertyRequired = (
  IPropertyStringRequired<any, any> | IPropertyNumberRequired<any, any> | IPropertyFloatRequired<any, any>
  | IPropertyBooleanRequired<any, any> | IPropertyIDRequired<any, any> | IPropertyJSONRequired<any, any>
  | IPropertyDateRequired<any, any>
  | IPropertyReferenceRequired<any, any, any> | IPropertyReversedReferenceRequired<any, any, any>
  | IPropertyArrayRequired<any, any, any> | IPropertySchemaRequired<any, any, any>
  | IPropertyRawRequired<any, any> | IPropertyScalarRequired<any, any>)

export type IProperty = IPropertyRequired | (
  IPropertyString | IPropertyNumber<any, any> | IPropertyFloat<any, any> | IPropertyBoolean<any, any>
  | IPropertyID<any, any> | IPropertyJSON<any, any> | IPropertyDate<any, any>
  | IPropertyReference<any, any, any> | IPropertyReversedReference<any, any, any>
  | IPropertyArray<any, any, any> | IPropertySchema<any, any, any>
  | IPropertyRaw<any, any> | IPropertyScalar<any, any>)

type NullableFields<T> = { [K in keyof T]: T[K] extends NonNullable<T[K]> ? never : K }[keyof T]
type NonNullableFields<T> = { [K in keyof T]: T[K] extends NonNullable<T[K]> ? K : never }[keyof T]

type OptionalNullable<T> = {
  [K in NonNullableFields<T>]: T[K]
} & {
  [K in NullableFields<T>]?: NonNullable<T[K]>
}

export type SchemaOutputType<T extends Schema> = OptionalNullable<{
  [P in (keyof T)]: PropertyOutputType<T[P]>
}>

export type PropertyOutputType<P extends SchemaField> =
  P extends IPropertyRequired ? Required<P>['valueType'] :
  P extends IProperty ? P['valueType'] :
  P extends Array<SchemaField> ? PropertyOutputType<P[0]>[] | undefined :
  P extends Schema ? SchemaOutputType<P> | undefined : undefined

export type SchemaInputType<T extends Schema> = OptionalNullable<{
  [P in (keyof T)]: PropertyInputType<T[P]>
}>

export type PropertyInputType<P extends SchemaField> =
  P extends IPropertyRequired ? Required<P>['valueInput'] :
  P extends IProperty ? P['valueInput'] :
  P extends Array<SchemaField> ? PropertyInputType<P[0]>[] | undefined :
  P extends Schema ? SchemaInputType<P> | undefined : undefined

// TODO: Definitely type SchemaOperatorType
export type SchemaOperatorType<T extends Schema> = {
  [P in (keyof T)]: any
}


export type SchemaField = IProperty | Schema | SchemaField[]
export type Schema = {
  [field: string]: SchemaField
}
