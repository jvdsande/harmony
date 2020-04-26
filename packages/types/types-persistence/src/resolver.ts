// Resolver enums
import { GraphQLResolveInfo } from 'graphql'
import { Model } from 'model'
import {
  Schema, SchemaInputType, SchemaOperatorType, SchemaOutputType,
} from 'property'

export type CrudEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasCrudEnum = CrudEnum|'get'|'list'|'edit'|'editMany'

// Helpers
type FilterArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema> & {
  _and?: FilterArgs<CurrentSchema>[]
  _or?: FilterArgs<CurrentSchema>[]
  _nor?: FilterArgs<CurrentSchema>[]
  _operators?: SchemaOperatorType<CurrentSchema>
} & (
  unknown extends CurrentSchema['_id'] ? { _id?: string } : {}
)>

type RecordArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema>> & (
  unknown extends CurrentSchema['_id'] ? { _id: string } : {}
)

type OutputType<CurrentSchema extends Schema> = SchemaOutputType<CurrentSchema> & (
  unknown extends CurrentSchema['_id'] ? { _id: string } : {}
)


export type ExtendedArgs<
  Extension extends AliasCrudEnum,
  CurrentSchema extends Schema
  > = (
  CrudEnum extends Extension ? any :
  'count' extends Extension ? { filter?: FilterArgs<CurrentSchema> } :
  'read' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'get' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'find' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'readMany' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number, limit?: number } :
  'list' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number, limit?: number } :

  'create' extends Extension ? { record: Partial<RecordArgs<CurrentSchema>> } :
  'createMany' extends Extension ? { records: Partial<RecordArgs<CurrentSchema>[]> } :
  'update' extends Extension ? { record: RecordArgs<CurrentSchema> } :
  'updateMany' extends Extension ? { records: RecordArgs<CurrentSchema>[] } :
  'edit' extends Extension ? { record: RecordArgs<CurrentSchema> } :
  'editMany' extends Extension ? { records: RecordArgs<CurrentSchema>[] } :
  'delete' extends Extension ? { _id: string } :
  'deleteMany' extends Extension ? { _ids: string[] } :
  any
)

export type ExtendedType<
  Extension extends AliasCrudEnum,
  CurrentSchema extends Schema
  > = (
  CrudEnum extends Extension ? any :
  'count' extends Extension ? number :
  'read' extends Extension ? OutputType<CurrentSchema>|null :
  'get' extends Extension ? OutputType<CurrentSchema>|null :
  'find' extends Extension ? OutputType<CurrentSchema>|null :
  'readMany' extends Extension ? OutputType<CurrentSchema>[] :
  'list' extends Extension ? OutputType<CurrentSchema>[] :

  'create' extends Extension ? OutputType<CurrentSchema>|null :
  'createMany' extends Extension ? OutputType<CurrentSchema>[] :
  'update' extends Extension ? OutputType<CurrentSchema>|null :
  'updateMany' extends Extension ? OutputType<CurrentSchema>[] :
  'edit' extends Extension ? OutputType<CurrentSchema>|null :
  'editMany' extends Extension ? OutputType<CurrentSchema>[] :
  'delete' extends Extension ? OutputType<CurrentSchema>|null :
  'deleteMany' extends Extension ? OutputType<CurrentSchema>[] :
  any
  )


// Internal Resolvers
export type ScopedInternalResolver = (arg: {
  source?: any
  args: {[key: string]: any}
  context: {[key: string]: any}
  info: GraphQLResolveInfo
}) => Promise<{[key: string]: any}|null>
export type UnscopedInternalResolver = (arg: {
  source?: any
  args: {[key: string]: any},
  context?: {[key: string]: any}
}) => Promise<{[key: string]: any}|null>
export type InternalResolver = ScopedInternalResolver & { unscoped: UnscopedInternalResolver }

export type ReferenceResolver = (params: {
  source: any
  context?: {[key: string]: any}
  internal: {[key: string]: any}
  info?: GraphQLResolveInfo

  fieldName: string,
  foreignFieldName: string
}) => Promise<{[key: string]: any}|null>

export type InternalResolvers =
  Record<AliasCrudEnum, InternalResolver> &
  Record<'reference'|'references', ReferenceResolver>


// Model Resolvers
export type ModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ((args: Args) => Promise<Return>)
export type ScopedModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ModelResolver<Args, Return> & { unscoped: ModelResolver<Args, Return> }

export type ScopedModelResolvers<CurrentSchema extends Schema = Schema> = {
  [key in AliasCrudEnum]: ScopedModelResolver<
    ExtendedArgs<key, CurrentSchema>,
    ExtendedType<key, CurrentSchema>
  >
}
export type ModelResolvers<CurrentModel extends Model = Model> = {
  [key in AliasCrudEnum]: ModelResolver<
    ExtendedArgs<key, Model['schema']>,
    ExtendedType<key, Model['schema']>
  >
}


// Resolvers
export type Resolver<
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<Schemas[schema]>}
  field: string
}) => Promise<Return>

export type Resolvers<
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
> = {
  [field: string]: Resolver<any, any, any, Context, Schemas>
}


// Scopes
export type Scope<
  Context extends any = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  HasResolvers extends boolean = true,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  field: string
} & (false extends HasResolvers ? {

} : {
  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<NonNullable<Schemas>[schema]>}
})) => Promise<(Args|undefined|void)>

export type Scopes<
  Context = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  CurrentSchema extends Schema = any,
  > = {
  [R in CrudEnum]?: Scope<
    Context, Schemas, CurrentSchema, ExtendedArgs<R, CurrentSchema>, false
  >
}


// Transforms
export type Transform<
  Context extends any = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  HasResolvers extends boolean = true,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  field: string
  value: Return|null
  error: Error|null
} & (false extends HasResolvers ? {

} : {
  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<NonNullable<Schemas>[schema]>}
})) => Promise<(Return|undefined|void)>

export type Transforms<
  Context = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  CurrentSchema extends Schema = any,
  > = {
  [R in CrudEnum]?: Transform<
    Context, Schemas, CurrentSchema, ExtendedArgs<R, CurrentSchema>, ExtendedType<R, CurrentSchema>, false
  >
}
