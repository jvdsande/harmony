import { Property, PropertySchema } from './type'

type KeyMap<T> = {
  [key: string]: T
}

type CustomKeyMap<T, U extends string> = {
  [key in U]?: T
}

export type Model = {
  name: string,
  external?: boolean,
  schema: PropertySchema,
  computed?: Computed,
  scopes?: Scopes,

  accessor?: string,
}

export type SanitizedModel = {
  name: string,
  external: boolean,
  schema: Property,
  originalSchema: Property,
  computed: SanitizedComputed,
  scopes: Scopes,
  accessor?: string,
}

export type Computed = {
  fields: Fields,
  queries: ExtendableFields,
  mutations: ExtendableFields,
  custom: KeyMap<KeyMap<{
    resolve: (any: any) => any
  }>>
}

export type SanitizedComputed = {
  fields: SanitizedFields,
  queries: SanitizedFields,
  mutations: SanitizedFields,
  custom: KeyMap<KeyMap<FieldBase>>,
}

export type Fields = KeyMap<Field>
export type ExtendableFields = KeyMap<ExtendableField>
export type SanitizedFields = KeyMap<SanitizedField>


export type FieldBase = {
  resolve: (arg: { args: any, source: any, resolvers: any[], context: any, info: any }) => any,
  mode?: FieldModeEnum | FieldModeEnum[]
}
type FieldType = FieldBase & {
  type: PropertySchema | Property,
  args?: PropertySchema,
}
type FieldTypeNotExtends = FieldType & {
  extends?: never,
}

type FieldExtends = FieldBase & {
  extends: string,
}
type FieldExtendsNotType = FieldExtends & {
  type?: never,
  args?: never,
}

export type SanitizedField = FieldBase & {
  type: Property,
  args?: PropertySchema,
}

export type Field = FieldType
export type ExtendableField = FieldTypeNotExtends | FieldExtendsNotType
export type CompleteField = FieldType & FieldExtends

export type FieldModeEnum = 'OUTPUT' | 'INPUT'

export type Scope = (arg: ScopeParams) => any

export type ScopeEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'

export type Scopes = CustomKeyMap<Scope, ScopeEnum>

export type ScopeParams = {
  args: any,
  context: any
}

export const FieldMode: { [key: string]: FieldModeEnum } = {  // eslint-disable-line
  OUTPUT: 'OUTPUT',
  INPUT: 'INPUT',
}
