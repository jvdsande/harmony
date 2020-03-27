import { IProperty, IPropertySchema, PropertyMode } from 'property'
import {
  Resolver, ResolverArgs, ResolverEnum, BaseResolverParams,
} from 'resolvers'

export type SchemaField = IProperty | SchemaDescription | SchemaField[]
export type SchemaDescription = { [key: string]: SchemaField }
export type Schema = SchemaDescription | IPropertySchema

type FieldBase = {
  resolve?: Resolver
  mode?: PropertyMode | PropertyMode[]

  scopes?: [Scope]
  transforms?: [Transform]
}

export type Field = FieldBase & {
  type: SchemaField
  args?: Schema
  extends?: never
}

export type FieldExtendsType = FieldBase & {
  extends: ResolverEnum
  args?: Schema
  type?: never
}

export type FieldExtendsArgs = FieldBase & {
  extends: ResolverEnum
  type?: SchemaField
  args?: never
}

export type ExtendableField = Field | FieldExtendsType | FieldExtendsArgs

export type Fields = Record<string, Field>
export type ExtendableFields = Record<string, ExtendableField>
export type Resolvers = Record<string, Resolver>

type ScopeParams = BaseResolverParams
export type Scope = (arg: ScopeParams) => ResolverArgs|undefined|void
export type Scopes = Partial<Record<ResolverEnum, Scope>>

type TransformParams = BaseResolverParams & { value?: any }
export type Transform = (arg: TransformParams) => any|undefined|void
export type Transforms = Partial<Record<ResolverEnum, Transform>>

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
  transforms?: Transforms

  external?: boolean
  adapter?: string

  [key: string]: any
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
  transforms: Transforms

  adapter?: string
  external: boolean

  [key: string]: any
}
