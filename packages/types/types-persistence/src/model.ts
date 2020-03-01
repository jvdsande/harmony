import { IProperty, IPropertySchema, PropertyMode } from 'property'
import { Resolver, ResolverEnum } from 'resolvers'

export type SchemaField = IProperty | SchemaDescription | [SchemaField]
export type SchemaDescription = { [key: string]: SchemaField }
export type Schema = SchemaDescription | IPropertySchema

type FieldBase = {
  resolve?: Resolver
}

export type Field = FieldBase & {
  type: SchemaField,
  args?: Schema,
  mode?: PropertyMode | PropertyMode[]
}

type FieldNotExtends = Field & {
  extends?: never,
}
type FieldExtends = FieldBase & {
  extends: ResolverEnum,
  type?: never,
  args?: never,
  mode?: PropertyMode | PropertyMode[]
}

export type ExtendableField = FieldNotExtends | FieldExtends

export type Fields = Record<string, Field>
export type ExtendableFields = Record<string, ExtendableField>
export type Resolvers = Record<string, Resolver>

type ScopeParams = {
  args?: Record<string, any>
  context?: Record<string, any>
}
export type Scope = (arg: ScopeParams) => Promise<Record<string, any>|undefined>
export type Scopes = Partial<Record<ResolverEnum, Scope>>


export type Computed = {
  fields?: Fields,
  queries?: ExtendableFields,
  mutations?: ExtendableFields,
  custom?: Record<string, Resolvers>
}

export type Model = {
  name: string,
  schema: Schema

  computed?: Computed
  scopes?: Scopes

  external?: boolean
  adapter?: string
}

export type SanitizedModel = {
  name: string

  schemas: {
    main: IPropertySchema
    computed: IPropertySchema
    queries: IPropertySchema
    mutations: IPropertySchema
  }

  resolvers: {
    computed: Resolvers
    queries: Resolvers
    mutations: Resolvers
    custom: Record<string, Resolvers>
  }

  scopes: Scopes

  adapter?: string
  external: boolean
}
