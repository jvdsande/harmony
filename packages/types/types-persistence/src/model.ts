import { GraphQLResolveInfo } from 'graphql'
import { IProperty, IPropertySchema, PropertyMode } from 'property'

export type SchemaLikeValue = IProperty | SchemaLike | SchemaLikeValue[]
export type SchemaLike = { [key: string]: SchemaLikeValue }
export type Schema = SchemaLike | IPropertySchema

export type ResolverEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasedResolverEnum = ResolverEnum|'get'|'list'|'edit'

export type ResolverArgs = Record<string, any>
export type ResolverSource = Record<string, any>
export type ResolverResolvers = Record<string, Record<ResolverEnum, (arg: any) => Promise<any>>>
export type ResolverContext = Record<string, any>
export type ResolverInfo = GraphQLResolveInfo

export type Resolver = (arg: {
  args: ResolverArgs,
  source: ResolverSource,
  resolvers: ResolverResolvers,
  context: ResolverContext,
  info: ResolverInfo
}) => Promise<any>

type FieldBase = {
  resolve?: Resolver
}

export type Field = FieldBase & {
  type: SchemaLikeValue,
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

type Scope = (arg: ScopeParams) => Record<string, any>|undefined
export type Scopes = Record<ResolverEnum, Scope>

type ScopeParams = {
  args: Record<string, any>
  context: Record<string, any>
}

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
