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

export type TypedComputedQuery<CurrentModel extends Schema,
  Context extends { [key: string]: any },
  Schemas extends { [key: string]: Schema },
  Extension extends ResolverEnum,
  Args extends Schema,
  Return extends SchemaField | undefined,
  > = (
  { extends: Extension, type?: Return, args?: never } |
  { extends: Extension, type?: never, args?: Args } |
  { extends?: never, type: Return, args?: Args }
)
  & {
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope<true,
    // Source
    any,
    // Args
    never extends Args
    ? ExtendedArgs<Extension, CurrentModel>
    : SchemaInputType<NonNullable<Args>>,
    Context,
    Schemas>[]
  transforms?: Transform<true,
    // Source
    any,
    // Args
    never extends Args
    ? ExtendedArgs<Extension, CurrentModel>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    never extends Return
    ? ExtendedType<Extension, CurrentModel>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>,
    Context,
    Schemas>[]

  resolve: Resolver<
    // Source
    any,
    // Args
    never extends Args
    ? ExtendedArgs<Extension, CurrentModel>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    never extends Return
    ? ExtendedType<Extension, CurrentModel>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>,
    Context,
    Schemas>
}

export type ComputedQuery<CurrentModel extends Schema = any,
  Context extends { [key: string]: any } = any,
  Schemas extends { [key: string]: Schema } = any,
  > =
  TypedComputedQuery<CurrentModel, Context, Schemas, ResolverEnum, any, any>

export type TypedComputedField<CurrentModel extends Schema,
  Context extends { [key: string]: any },
  Schemas extends { [key: string]: Schema },
  Args extends Schema | undefined,
  Return extends SchemaField,
  > = {
  type: Return
  args?: Args
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope<true,
    SchemaOutputType<CurrentModel>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Context,
    Schemas>[]
  transforms?: Transform<true,
    SchemaOutputType<CurrentModel>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>,
    Context,
    Schemas>[]

  resolve?: Resolver<SchemaOutputType<CurrentModel> & { _id: string },
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>,
    Context,
    Schemas
  >
}

export type ComputedField<CurrentModel extends Schema = any,
  Context extends { [key: string]: any } = any,
  Models extends { [key: string]: Schema } = any> = TypedComputedField<CurrentModel, Context, Models, any, any>


export type Computed<CurrentModel extends Schema = any,
  Context extends { [key: string]: any } = { [key: string]: any },
  Schemas extends { [key: string]: Schema } = any> = {
  fields?: {
    [field: string]: ComputedField<CurrentModel, Context, Schemas>
  }
  queries?: {
    [field: string]: ComputedQuery<CurrentModel, Context, Schemas>
  }
  mutations?: {
    [field: string]: ComputedQuery<CurrentModel, Context, Schemas>
  }
  custom?: {
    [type: string]: Resolvers
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

  adapter?: string
  external: boolean

  [key: string]: any
}
