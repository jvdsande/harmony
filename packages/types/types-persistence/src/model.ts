import {
  IPropertySchema, PropertyMode, Schema,
  SchemaOutputType,
  SchemaInputType,
  PropertyOutputType, SchemaField,
} from 'property'

import {
  ResolverEnum,
  Resolver, Resolvers,
  Scope, Scopes,
  Transform, Transforms,

  ExtendedArgs, ExtendedType,
} from 'resolver'

export type TypedComputedQuery<
  Context extends { [key: string]: any },
  Schemas extends { [key: string]: Schema },
  CurrentSchema extends Schema,
  Extension extends ResolverEnum,
  Args extends Schema,
  Return extends SchemaField,
  > = (
  { extends: Extension, type?: Return, args?: never } |
  { extends: Extension, type?: never, args?: Args } |
  { extends?: never, type: Return, args?: Args }
)
  & {
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope<
    Context,
    Schemas,
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>>[]
  transforms?: Transform<
    Context,
    Schemas,
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    undefined extends Return
    ? ExtendedType<Extension, CurrentSchema>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>>[]

  resolve: Resolver<
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    undefined extends Return
    ? ExtendedType<Extension, CurrentSchema>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>,
    Context,
    Schemas>
}

export type ComputedQuery<Context extends { [key: string]: any } = any,
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> =
  TypedComputedQuery<Context, Schemas, CurrentSchema, ResolverEnum, any, any>

export type TypedComputedField<
  Context extends { [key: string]: any },
  Schemas extends { [key: string]: Schema },
  CurrentSchema extends Schema,
  Args extends Schema | undefined,
  Return extends SchemaField,
  > = {
  type: Return
  args?: Args
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope<
    Context,
    Schemas,
    SchemaOutputType<CurrentSchema>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>>[]
  transforms?: Transform<
    Context,
    Schemas,
    SchemaOutputType<CurrentSchema>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>>[]

  resolve?: Resolver<SchemaOutputType<CurrentSchema> & { _id: string },
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>,
    Context,
    Schemas
  >
}

export type ComputedField<Context extends { [key: string]: any } = any,
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> = TypedComputedField<Context, Schemas, CurrentSchema, any, any>


export type Computed<
  Context extends { [key: string]: any } = { [key: string]: any },
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> = {
  fields?: {
    [field: string]: ComputedField<Context, Schemas, CurrentSchema>
  }
  queries?: {
    [field: string]: ComputedQuery<Context, Schemas, CurrentSchema>
  }
  mutations?: {
    [field: string]: ComputedQuery<Context, Schemas, CurrentSchema>
  }
  custom?: {
    [type: string]: Resolvers<Context, Schemas>
  }
}

export type Model = {
  schema: Schema

  computed?: Computed
  scopes?: Scopes
  transforms?: Transforms

  external?: boolean
  adapter?: string

  // A model can be extended with any kind of properties
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
    custom: {
      [type: string]: Resolvers
    }
  }

  scopes: Scopes
  transforms: Transforms

  adapter: string
  external: boolean

  [key: string]: any
}
