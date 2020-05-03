import { IQueryBuilder } from 'builder'
import { QueryDefinition } from 'query'

export type ClientConfiguration = {
  graphql?: {
    host: string
    port?: string|number
    path?: string
    headers?: {
      [key: string]: string
    }
    fetchPolicy?: 'network-only' | 'cache-first'
  }
  socket?: {
    host: string
    port?: string|number
    path?: string
  }
}

export interface IClient {
  configure(configuration: ClientConfiguration): this
  close(): Promise<void>

  query<T = {[key: string]: any}>(query: QueryDefinition): Promise<T>
  mutation<T = {[key: string]: any}>(mutation: QueryDefinition): Promise<T>

  subscribe(event: string, callback: Function): this
  unsubscribe(event: string, callback: Function): this

  builder: IQueryBuilder<any>
  fork: IClient
}
