import { QueryDefinition, QueryArgs, QuerySelect } from 'query'

export interface IQueryBuilder<T = {[key: string]: any}> {
  withName(name?: string): this
  withAlias(name?: string): this
  withArgs(args?: QueryArgs): this
  withSelection(selection?: QuerySelect): this
  build(): QueryDefinition

  asQuery(): Promise<T>
  asMutation(): Promise<T>

  combineQueries(queries: IQueryBuilder[]): Promise<Record<string, any>[]>
  combineMutations(mutations: IQueryBuilder[]): Promise<Record<string, any>[]>
}
