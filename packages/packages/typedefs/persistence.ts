import { LogConfig } from './logger'


type FieldFunctionParameters = {
  schemaComposer: Object,
  composers: Object,
  scopeAccessResolver: (any, string) => Object,
  models: Object,
}

type FieldDescriptor = {
  [key: string]: any, // TODO: Strongly type
}

type FieldFunction = (FieldFunctionParamters) => {
  fields: {
    [key: string]: FieldDescriptor
  },
  queries: {
    [key: string]: FieldDescriptor
  },
  mutations: {
    [key: string]: FieldDescriptor
  },
}

type ScopeFunction = () => Promise<Object>

export type ModelElasticsearchField = {
  [key: string]: {
    es_populate: any,
  }
}

export type Model = {
  name: string,
  schema: any,
  fields?: FieldFunction,
  scope?: ScopeFunction,
  collection?: string | null,
  composer?: string | null,

  onPostSave?: (arg: any) => void,
  onPostRemove?: (arg: any) => void,

  elasticsearch?: {
    fields: ModelElasticsearchField
  },
}

export type PersistenceConfiguration = {
  models: Array<Model>,
  query?: FieldFunction,
  mutation?: FieldFunction,
  log?: LogConfig,
  endpoint?: string,
  elasticsearch?: {
    protocol: string,
    host: string,
    port: string,
    auth: string,
    prefix: string,
  },
}

export type MakeComposerArguments = {
  schemaComposer: Object,
  models: {
    [key: string]: Model
  },
  refMap: {
    [key: string]: Model
  },
  scopeAccessResolver: (any) => ((arg1: any, arg2: string, arg3: string) => any),
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
