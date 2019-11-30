import { Model } from './persistence/model'
import Accessor from './persistence/accessor'

export { default as Accessor } from './persistence/accessor'
export {
  FieldMode, Model, FieldModeEnum, Fields, Field, SanitizedModel,
} from './persistence/model'
export { default as Events } from './persistence/events'
export { Property, PropertyOf, PropertySchema } from './persistence/type'

export type PersistenceConfig = {
  models: Model[],
  accessors?: {[key: string]: Accessor},
  defaultAccessor?: string,
  log: any,
  strict?: boolean,
}
