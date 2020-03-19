import { QueryDefinition, QueryArgs, QuerySelect } from 'query'

export interface IQueryBuilder {
  withName(name?: string): this
  withAlias(name?: string): this
  withArgs(args?: QueryArgs): this
  withSelection(selection?: QuerySelect): this
  build(): QueryDefinition

  asQuery(): Promise<Record<string, any>>
  asMutation(): Promise<Record<string, any>>

  combineQueries(queries: IQueryBuilder[]): Promise<Record<string, any>[]>
  combineMutations(mutations: IQueryBuilder[]): Promise<Record<string, any>[]>
}
