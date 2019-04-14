import { LogConfig } from './logger'

// TODO: Strongly type

type FieldFunctionParameters = {
  schemaComposer: any,
  composers: any,
  scopeAccessResolver: (any, string) => any,
  models: any,
}

type FieldDescriptor = {
  [key: string]: any,
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

type ScopeFunction = () => Promise<any>

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
  schemaComposer: any,
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
  source: any,
  args: any,
  context: any,
  info: any,
  composers: any,
  type: 'get' | 'list' | 'count' | 'create' | 'createMany' | 'update' | 'delete',
}

export type FieldFunctionArguments = {
  typeComposers: any,
}

export type FieldResolveArguments = {
  source: any,
  args: any,
  context: any,
  info: any,
  composers: any,
}
