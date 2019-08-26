// Query object

export type QuerySelect = {
  [key: string]: boolean | QuerySelect
}

export type QueryArgsMap = {
  [key: string]: any
}

export type QueryArgs = QueryArgsMap | string

export type PureQuerySelect = {
  [key: string]: QuerySelect
}

export type QueryField = {
  args?: QueryArgs,
  select?: PureQuerySelect,
  // Deprecated
  get?: PureQuerySelect,
}

export type QueryDefinition = {
  [key: string]: QueryField | boolean
}

export type QueryConfiguration = {
  token?: string | null,
  endpoint?: {
    port?: string,
    host: string
  },
  path?: {
    graphql?: string,
    socket?: string,
  }
  fetchPolicy?: 'network-only' | 'cache-first',
}

export type QueryCallback = (arg: QueryArgs | Array<QueryArgs>) => any


// Builders
export type QueryType = 'COUNT' | 'LIST' | 'GET' | 'SEARCH'

export type MutationType = 'UPDATE' | 'CREATE' | 'DELETE'
