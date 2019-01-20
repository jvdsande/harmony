// @flow

import type { LogConfig } from './logger'

type FieldFunction = ({
                        schemaComposer: Object,
                        composers: Object,
                        scopeAccessResolver: (Object, string) => Object,
                        models: Object,
                      }) => void
type ScopeFunction = () => Promise<Object>

export type Model = {
  name: string,
  schema: Object,
  fields?: FieldFunction,
  scope?: ScopeFunction,
  collection?: ?string,
  composer?: ?string,

  onPostSave?: (Object) => void,
  onPostRemove?: (Object) => void,
}

export type PersistenceConfiguration = {
  models: Array<Model>,
  query?: FieldFunction,
  mutation?: FieldFunction,
  log?: LogConfig,
  endpoint?: string,
}


export type MakeComposerArguments = {
  schemaComposer: Object,
  models: {
    [string]: Object
  },
  refMap: {
    [string]: Object
  },
  scopeAccessResolver: (Object) => (Object, string, string) => Object,
  exclude?: Array<string>,
}

export type ScopeFunctionArguments = {
  source: Object,
  args: Object,
  context: Object,
  info: Object,
  composers: Object,
  type: 'get' | 'list' | 'count' | 'create' | 'createMany' | 'update' | 'delete',
}

export type FieldFunctionArguments = {
  typeComposers: Object,
}

export type FieldResolveArguments = {
  source: Object,
  args: Object,
  context: Object,
  info: Object,
  composers: Object,
}
