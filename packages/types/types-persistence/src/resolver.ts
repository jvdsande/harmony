// Resolver enums
import { GraphQLResolveInfo } from 'graphql'
import {
  Schema, SchemaInputType, SchemaOperatorType, SchemaOutputType,
} from 'property'

export type ResolverEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasedResolverEnum = ResolverEnum|'get'|'list'|'edit'|'editMany'

// Helpers
type FilterArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema> & {
  _id?: string,
  _and?: FilterArgs<CurrentSchema>[]
  _or?: FilterArgs<CurrentSchema>[]
  _nor?: FilterArgs<CurrentSchema>[]
  _operators?: SchemaOperatorType<CurrentSchema>
}>

type RecordArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema>> & {
  _id: string
}

export type ExtendedArgs<
  Extension extends AliasedResolverEnum,
  CurrentSchema extends Schema
  > = (
  ResolverEnum extends Extension ? any :
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
  Extension extends AliasedResolverEnum,
  CurrentSchema extends Schema
  > = (
  ResolverEnum extends Extension ? any :
  'count' extends Extension ? number :
  'read' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'get' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'find' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'readMany' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :
  'list' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :

  'create' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'createMany' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :
  'update' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'updateMany' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :
  'edit' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'editMany' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :
  'delete' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })|null :
  'deleteMany' extends Extension ? (SchemaOutputType<CurrentSchema> & { _id: string })[] :
  any
  )


// Internal Resolvers
export type ScopedInternalResolver = (arg: {
  source?: any
  args: {[key: string]: any}
  context: {[key: string]: any}
  info: GraphQLResolveInfo
}) => {[key: string]: any}|Promise<{[key: string]: any}>
export type UnscopedInternalResolver = (arg: {
  args: {[key: string]: any}
}) => {[key: string]: any}|Promise<{[key: string]: any}>
export type InternalResolver = ScopedInternalResolver & { unscoped: UnscopedInternalResolver }

export type ReferenceResolver = (params: {
  source: any
  context?: {[key: string]: any}
  info?: GraphQLResolveInfo

  fieldName: string,
  foreignFieldName: string
}) => {[key: string]: any}|null|Promise<{[key: string]: any}|null>

export type InternalResolvers =
  Record<AliasedResolverEnum, InternalResolver> &
  Record<'reference'|'references', ReferenceResolver>


// Model Resolvers
export type ScopedModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ((args: Args) => Promise<Return>|Return)
export type UnscopedModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
  > = ((args: Args) => Promise<Return>|Return)
export type ModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ScopedModelResolver<Args, Return> & { unscoped: UnscopedModelResolver<Args, Return> }

export type ModelResolvers<CurrentSchema extends Schema = Schema> = {
  [key in AliasedResolverEnum]: ModelResolver<ExtendedArgs<key, CurrentSchema>, ExtendedType<key, CurrentSchema>>
}
export type UnscopedModelResolvers<CurrentSchema extends Schema = Schema> = {
  [key in AliasedResolverEnum]: UnscopedModelResolver<ExtendedArgs<key, CurrentSchema>>
}


// Resolvers
export type Resolver<
  Source extends any = {[key: string]: any},
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  Context extends {[key: string]: any} = {[key: string]: any},
  Schemas extends { [key: string]: Schema } = any,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  resolvers: {[schema in keyof Schemas]: ModelResolvers<Schemas[schema]>}
  field: string
}) => Return|Promise<Return>

export type Resolvers = {
  [field: string]: Resolver
}


// Scopes
export type Scope<
  Context extends {[key: string]: any} = {[key: string]: any},
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
  resolvers: {[schema in keyof Schemas]: ModelResolvers<NonNullable<Schemas>[schema]>}
})) => (Args|undefined|void)|Promise<(Args|undefined|void)>

export type Scopes = Partial<Record<ResolverEnum, Scope<
  {[key: string]: any}, any, any, {[key: string]: any}, false
>>>


// Transforms
export type Transform<
  Context extends {[key: string]: any} = {[key: string]: any},
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
  resolvers: {[schema in keyof Schemas]: ModelResolvers<NonNullable<Schemas>[schema]>}
})) => (Return|undefined|void)|Promise<(Return|undefined|void)>

export type Transforms = Partial<Record<ResolverEnum, Transform<
  {[key: string]: any}, any, any, {[key: string]: any}, any, false
>>>
