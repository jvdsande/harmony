import {
  AliasedResolverEnum, ResolverArgs, ResolverContext, ResolverInfo, ResolverSource,
} from 'model'

export type ClassicResolverFunction = (arg: {
  source?: ResolverSource, args?: ResolverArgs, context?: ResolverContext, info?: ResolverInfo,
}) => any
export type ReferenceResolverFunction = (arg: {
  source?: ResolverSource, context?: ResolverContext, info?: ResolverInfo, fieldName: string, foreignFieldName: string
}) => any

export type ResolverFunction = ClassicResolverFunction|ReferenceResolverFunction

export type ModelResolver =
  Record<AliasedResolverEnum, ClassicResolverFunction> &
  Record<'reference'|'references', ReferenceResolverFunction>
