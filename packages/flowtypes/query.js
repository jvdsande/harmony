// @flow


// Query object

export type QuerySelect = {
  [string]: boolean | QuerySelect
}

export type QueryArgs = {
  [string]: any
}

export type PureQuerySelect = {
  [string]: QuerySelect
}

export type QueryField = {
  args: ?QueryArgs,
  select: ?PureQuerySelect,
  // Deprecated
  get: PureQuerySelect,
}

export type QueryDefinition = {
  [string]: QueryField | boolean
}

export type QueryConfiguration = {
  token?: ?string,
  uri?: ?string,
  fetchPolicy?: 'network-only' | 'cache-first',
}


// Builders
export type QueryType = 'COUNT' | 'LIST' | 'GET'

export type MutationType = 'UPDATE' | 'CREATE' | 'DELETE'
