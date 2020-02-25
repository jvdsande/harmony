import { IQueryBuilder } from 'builder'
import { QueryDefinition } from 'query'

export type ClientConfiguration = {
  token?: string | null
  endpoint?: {
    port?: string
    host: string
  }
  path?: {
    graphql?: string
    socket?: string
  }
  fetchPolicy?: 'network-only' | 'cache-first'
}

export interface IClient {
  configure(configuration: ClientConfiguration): this
  query(query: QueryDefinition): Promise<Record<string, any>>
  mutation(mutation: QueryDefinition): Promise<Record<string, any>>

  subscribe(event: string, callback: Function): this
  unsubscribe(event: string, callback: Function): this

  builder: IQueryBuilder
}
