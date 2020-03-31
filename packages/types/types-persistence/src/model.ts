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

export type Field<C, R extends string> = FieldBase & {
  resolve: FieldResolver<C, R>

  type: SchemaField
  args?: Schema
  extends?: never

  scopes?: Scope<FieldResolverParams>[]
  transforms?: Transform<FieldResolverParams>[]
}

export type ExtendableFieldBase<C, R extends string> = FieldBase & {
  resolve: QueryResolver<C, R>

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

export type ExtendableField<C, R extends string> =
  ExtendableFieldBase<C, R> & (FieldArgsType | FieldExtendsType | FieldExtendsArgs)

export type Fields<C, R extends string> = Record<string, Field<C, R>>
export type ExtendableFields<C, R extends string> = Record<string, ExtendableField<C, R>>
export type Resolvers<C, R extends string> = Record<string, QueryResolver<C, R>|FieldResolver<C, R>>

type ScopeParams<T = BaseResolverParams> = T & { field: string }
export type Scope<T = BaseResolverParams> = (arg: ScopeParams<T>) => ResolverArgs|undefined|void
export type Scopes = Partial<Record<ResolverEnum, Scope<QueryResolverParams>>>

type TransformParams<T = BaseResolverParams> = T & { value?: any, field: string }
export type Transform<T = BaseResolverParams> = (arg: TransformParams<T>) => any|undefined|void
export type Transforms = Partial<Record<ResolverEnum, Transform<QueryResolverParams>>>

export type Computed<T = ResolverContext, C extends string = string> = {
  fields?: Fields<T, C>,
  queries?: ExtendableFields<T, C>,
  mutations?: ExtendableFields<T, C>,
  custom?: Record<string, Resolvers<T, C>>
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
    computed: Resolvers<ResolverContext, string>
    queries: Resolvers<ResolverContext, string>
    mutations: Resolvers<ResolverContext, string>
    custom: Record<string, Resolvers<ResolverContext, string>>
  }

  scopes: Scopes
  transforms: Transforms

  adapter?: string
  external: boolean

  [key: string]: any
}
