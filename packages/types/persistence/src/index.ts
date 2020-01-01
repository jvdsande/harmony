import { LogConfig } from '@harmonyjs/types-logger'

import { Model } from './persistence/model'
import Accessor from './persistence/accessor'

export { default as Accessor } from './persistence/accessor'
export {
  Model, SanitizedModel,
  FieldMode, FieldModeEnum,
  FieldBase,
  Fields, Field,
  ExtendableField, ExtendableFields,
  CompleteField,
  SanitizedFields, SanitizedField,

  Scope, Scopes, ScopeEnum,
  Computed, SanitizedComputed,
} from './persistence/model'
export { default as Events } from './persistence/events'
export { Property, PropertyOf, PropertySchema } from './persistence/type'

export type PersistenceConfig = {
  models: Model[],
  accessors?: {[key: string]: Accessor},
  defaultAccessor?: string,
  log?: LogConfig,
  strict?: boolean,
}
