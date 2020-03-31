import { GraphQLResolveInfo } from 'graphql'

export type ResolverEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasedResolverEnum = ResolverEnum|'get'|'list'|'edit'|'editMany'

export type ResolverArgs = Record<string, any>
export type ResolverSource = Record<string, any>
export type ResolverResolvers<U extends string = string> = Record<
  U,
  Record<
    AliasedResolverEnum,
    ((arg: any) => Promise<any>) & { unscoped: ((arg: any) => Promise<any>) }
  >
>
export type ResolverContext = Record<string, any>
export type ResolverInfo = GraphQLResolveInfo

export type BaseResolverParams<C = ResolverContext> = {
  args?: ResolverArgs,
  source?: ResolverSource,
  context?: C,
  info?: ResolverInfo
}
export type FieldResolverParams<C = ResolverContext, R extends string = string> = {
  resolvers: ResolverResolvers<R>,
  source: ResolverSource,
  context: C,
  info: ResolverInfo
  field: string,
}
export type QueryResolverParams<C = ResolverContext, R extends string = string> = FieldResolverParams<C, R> & {
  args: ResolverArgs
  field: string,
}

export type FieldResolver<C, R extends string> = (arg: FieldResolverParams<C, R>) => Promise<any>
export type QueryResolver<C, R extends string> = (arg: QueryResolverParams<C, R>) => Promise<any>

export type ClassicResolverFunction = (arg: {
  source?: ResolverSource, args?: ResolverArgs, context?: ResolverContext, info?: ResolverInfo,
}) => any
export type ReferenceResolverFunction = (arg: {
  source?: ResolverSource, context?: ResolverContext, info?: ResolverInfo, fieldName: string, foreignFieldName: string
}) => any

export type ResolverFunction = ClassicResolverFunction|ReferenceResolverFunction

export type ModelResolver =
  Record<AliasedResolverEnum, ClassicResolverFunction & { unscoped: ClassicResolverFunction }> &
  Record<'reference'|'references', ReferenceResolverFunction>
