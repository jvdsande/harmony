import { QueryDefinition, QueryArgs, QuerySelect } from 'query'

export interface IQueryBuilder {
  withName(name?: string): this
  withArgs(args?: QueryArgs): this
  withSelection(selection?: QuerySelect): this
  build(): QueryDefinition

  asQuery(): Promise<Record<string, any>>
  asMutation(): Promise<Record<string, any>>
}
