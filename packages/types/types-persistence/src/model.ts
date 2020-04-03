import { IProperty, IPropertySchema, PropertyMode } from 'property'
import {
  QueryResolver, FieldResolver, ResolverArgs, ResolverEnum, BaseResolverParams, QueryResolverParams,
  FieldResolverParams, ResolverContext,
} from 'resolvers'

export type SchemaField = IProperty | SchemaDescription | SchemaField[]
export type SchemaDescription = { [key: string]: SchemaField }
export type Schema = SchemaDescription | IPropertySchema

type FieldBase = {
  mode?: PropertyMode | PropertyMode[]
}

export type Field<C = ResolverContext, R extends string = string> = FieldBase & {
  resolve: FieldResolver<C, R>

  type: SchemaField
  args?: Schema
  extends?: never

  scopes?: Scope<C, FieldResolverParams<C, R>>[]
  transforms?: Transform<C, FieldResolverParams<C, R>>[]
}

export type ExtendableFieldBase<C, R extends string> = FieldBase & {
  resolve: QueryResolver<C, R>

  scopes?: Scope<C, QueryResolverParams<C, R>>[]
  transforms?: Transform<C, QueryResolverParams<C, R>>[]
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

export type ExtendableField<C = ResolverContext, R extends string = string> =
  ExtendableFieldBase<C, R> & (FieldArgsType | FieldExtendsType | FieldExtendsArgs)

export type Fields<C = ResolverContext, R extends string = string> =
  Record<string, Field<C, R>>
export type ExtendableFields<C = ResolverContext, R extends string = string> =
  Record<string, ExtendableField<C, R>>
export type Resolvers<C = ResolverContext, R extends string = string> =
  Record<string, QueryResolver<C, R>|FieldResolver<C, R>>

type ScopeParams<C = ResolverContext, T = BaseResolverParams<C>> = T & { field: string }
export type Scope<C = ResolverContext, T = BaseResolverParams<C>> =
  (arg: ScopeParams<C, T>) => ResolverArgs|undefined|void
export type Scopes<C = ResolverContext> =
  Partial<Record<ResolverEnum, Scope<C, Omit<QueryResolverParams<C>, 'resolvers'>>>>

type TransformParams<C = ResolverContext, T = BaseResolverParams<C>> = T & { value?: any, error?: Error, field: string }
export type Transform<C = ResolverContext, T = BaseResolverParams<C>> =
  (arg: TransformParams<C, T>) => any|undefined|void
export type Transforms<C = ResolverContext> =
  Partial<Record<ResolverEnum, Transform<C, Omit<QueryResolverParams<C>, 'resolvers'>>>>

export type Computed<ContextType = ResolverContext, ResolverEnum extends string = string> = {
  fields?: Fields<ContextType, ResolverEnum>,
  queries?: ExtendableFields<ContextType, ResolverEnum>,
  mutations?: ExtendableFields<ContextType, ResolverEnum>,
  custom?: Record<string, Resolvers<ContextType, ResolverEnum>>
}

export type Model = {
  name: string,
  schema: Schema

  computed?: Computed<any>
  scopes?: Scopes<any>
  transforms?: Transforms<any>

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
