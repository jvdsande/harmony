import { IProperty, IPropertySchema, PropertyMode } from 'property'
import {
  QueryResolver, FieldResolver, ResolverArgs, ResolverEnum, BaseResolverParams, QueryResolverParams,
  FieldResolverParams,
} from 'resolvers'

export type SchemaField = IProperty | SchemaDescription | SchemaField[]
export type SchemaDescription = { [key: string]: SchemaField }
export type Schema = SchemaDescription | IPropertySchema

type FieldBase = {
  mode?: PropertyMode | PropertyMode[]
}

export type Field = FieldBase & {
  resolve: FieldResolver

  type: SchemaField
  args?: Schema
  extends?: never

  scopes?: Scope<FieldResolverParams>[]
  transforms?: Transform<FieldResolverParams>[]
}

export type ExtendableFieldBase = FieldBase & {
  resolve: QueryResolver

  scopes?: Scope<QueryResolverParams>[]
  transforms?: Transform<QueryResolverParams>[]
}

export type FieldArgsType = {
  type: SchemaField
  args?: Schema
  extends?: never
}

export type FieldExtendsType = {
  extends: ResolverEnum
  args?: Schema
  type?: never
}

export type FieldExtendsArgs = {
  extends: ResolverEnum
  type?: SchemaField
  args?: never
}

export type ExtendableField = ExtendableFieldBase & (FieldArgsType | FieldExtendsType | FieldExtendsArgs)

export type Fields = Record<string, Field>
export type ExtendableFields = Record<string, ExtendableField>
export type Resolvers = Record<string, QueryResolver|FieldResolver>

type ScopeParams<T = BaseResolverParams> = T
export type Scope<T = BaseResolverParams> = (arg: ScopeParams<T>) => ResolverArgs|undefined|void
export type Scopes = Partial<Record<ResolverEnum, Scope<QueryResolverParams>>>

type TransformParams<T = BaseResolverParams> = T & { value?: any }
export type Transform<T = BaseResolverParams> = (arg: TransformParams<T>) => any|undefined|void
export type Transforms = Partial<Record<ResolverEnum, Transform<QueryResolverParams>>>

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
