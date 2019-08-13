import { SchemaType } from './schema-types'

export type Model = {
  name: string,
  external?: boolean,
  schema: Schema,
  fields?: RootFields,
  scopes?: Scopes,

  accessor?: string,
}

export type Schema = {
  [key: string]: SchemaEntry
}

export type SchemaEntry = SchemaType | Schema

export type RootFields = {
  fields: Fields,
  queries: Fields,
  mutations: Fields,
}

export type Fields = {
  [key: string]: Field
}

export type Field = {
  type: SchemaEntry
  args: Schema,
  needs: {
    [key: string]: boolean
  }
  resolve: (any: any) => any
  mode: FieldModeEnum | FieldModeEnum[]
}

export type FieldModeEnum = 'OUTPUT' | 'INPUT'

export type Scopes = {
  [key: string]: Scope
}

export type Scope = (arg: ScopeParams) => any

export type ScopeParams = {
  args: any,
  context: any
}

export const FieldMode: { [key: string]: FieldModeEnum } = {  // eslint-disable-line
  OUTPUT: 'OUTPUT',
  INPUT: 'INPUT',
}
