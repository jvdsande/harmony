import { GraphQLResolveInfo } from 'graphql'

export type ResolverEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
export type AliasedResolverEnum = ResolverEnum|'get'|'list'|'edit'|'editMany'

export type ResolverArgs = Record<string, any>
export type ResolverSource = Record<string, any>
export type ResolverResolvers = Record<
  string,
  Record<
    AliasedResolverEnum,
    ((arg: any) => Promise<any>) & { unscoped: ((arg: any) => Promise<any>) }
  >
>
export type ResolverContext = Record<string, any>
export type ResolverInfo = GraphQLResolveInfo

export type BaseResolverParams = {
  args?: ResolverArgs,
  source?: ResolverSource,
  context?: ResolverContext,
  info?: ResolverInfo
}
export type FieldResolverParams = {
  resolvers: ResolverResolvers,
  source: ResolverSource,
  context: ResolverContext,
  info: ResolverInfo
  field: string,
}
export type QueryResolverParams = FieldResolverParams & {
  args: ResolverArgs
  field: string,
}

export type FieldResolver = (arg: FieldResolverParams) => Promise<any>
export type QueryResolver = (arg: QueryResolverParams) => Promise<any>

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
