// Resolver enums
import { GraphQLResolveInfo } from 'graphql'
import {
  Schema, SchemaInputType, SchemaOperatorType, SchemaOutputType,
} from 'property'

export type ResolverEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasedResolverEnum = ResolverEnum|'get'|'list'|'edit'|'editMany'

// Helpers
type FilterArgs<Model extends Schema> = Partial<SchemaInputType<Model> & {
  _id?: string,
  _and?: FilterArgs<Model>[]
  _or?: FilterArgs<Model>[]
  _nor?: FilterArgs<Model>[]
  _operators?: SchemaOperatorType<Model>
}>

type RecordArgs<Model extends Schema> = Partial<SchemaInputType<Model>> & {
  _id: string
}

export type ExtendedArgs<
  Extension extends AliasedResolverEnum,
  Model extends Schema
  > = (
  ResolverEnum extends Extension ? any :
  'count' extends Extension ? { filter?: FilterArgs<Model> } :
  'read' extends Extension ? { filter?: FilterArgs<Model>, skip?: number } :
  'get' extends Extension ? { filter?: FilterArgs<Model>, skip?: number } :
  'find' extends Extension ? { filter?: FilterArgs<Model>, skip?: number } :
  'readMany' extends Extension ? { filter?: FilterArgs<Model>, skip?: number, limit?: number } :
  'list' extends Extension ? { filter?: FilterArgs<Model>, skip?: number, limit?: number } :

  'create' extends Extension ? { record: Partial<RecordArgs<Model>> } :
  'createMany' extends Extension ? { records: Partial<RecordArgs<Model>[]> } :
  'update' extends Extension ? { record: RecordArgs<Model> } :
  'updateMany' extends Extension ? { records: RecordArgs<Model>[] } :
  'edit' extends Extension ? { record: RecordArgs<Model> } :
  'editMany' extends Extension ? { records: RecordArgs<Model>[] } :
  'delete' extends Extension ? { _id: string } :
  'deleteMany' extends Extension ? { _ids: string[] } :
  any
  )

export type ExtendedType<
  Extension extends AliasedResolverEnum,
  Model extends Schema
  > = (
  ResolverEnum extends Extension ? any :
  'count' extends Extension ? number :
  'read' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'get' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'find' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'readMany' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :
  'list' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :

  'create' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'createMany' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :
  'update' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'updateMany' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :
  'edit' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'editMany' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :
  'delete' extends Extension ? (SchemaOutputType<Model> & { _id: string })|null :
  'deleteMany' extends Extension ? (SchemaOutputType<Model> & { _id: string })[] :
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

export type ModelResolvers<Model extends Schema = Schema> = {
  [key in AliasedResolverEnum]: ModelResolver<ExtendedArgs<key, Model>, ExtendedType<key, Model>>
}
export type UnscopedModelResolvers<Model extends Schema = Schema> = {
  [key in AliasedResolverEnum]: UnscopedModelResolver<ExtendedArgs<key, Model>>
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

  resolvers: {[model in keyof Schemas]: ModelResolvers<Schemas[model]>}
  field: string
}) => Return|Promise<Return>

export type Resolvers = {
  [field: string]: Resolver
}


// Scopes
export type Scope<
  HasResolvers extends boolean,
  Source extends any = {[key: string]: any},
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Context extends {[key: string]: any} = {[key: string]: any},
  Schemas extends { [key: string]: Schema }|undefined = any,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  field: string
} & (false extends HasResolvers ? {

} : {
  resolvers: {[model in keyof Schemas]: ModelResolvers<NonNullable<Schemas>[model]>}
})) => (Args|undefined|void)|Promise<(Args|undefined|void)>

export type Scopes = Partial<Record<ResolverEnum, Scope<false>>>


// Transforms
export type Transform<
  HasResolvers extends boolean,
  Source extends any = {[key: string]: any},
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  Context extends {[key: string]: any} = {[key: string]: any},
  Schemas extends { [key: string]: Schema }|undefined = any,
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
  resolvers: {[model in keyof Schemas]: ModelResolvers<NonNullable<Schemas>[model]>}
})) => (Return|undefined|void)|Promise<(Return|undefined|void)>

export type Transforms = Partial<Record<ResolverEnum, Transform<false>>>
