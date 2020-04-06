/* Factories for building Properties, externally called "Types" */
import {
  IPropertyArray,
  IPropertySchema, Schema, SchemaField,
} from '@harmonyjs/types-persistence'

import PropertyFactory from 'utils/property/factory'
import { sanitizeArray, sanitizeSchema } from 'utils/property/sanitation'

const Types = {
  get String() {
    return PropertyFactory({ name: '', type: 'string' })
  },
  get Number() {
    return PropertyFactory({ name: '', type: 'number' })
  },
  get Float() {
    return PropertyFactory({ name: '', type: 'float' })
  },
  get Boolean() {
    return PropertyFactory({ name: '', type: 'boolean' })
  },
  get ID() {
    return PropertyFactory({ name: '', type: 'id' })
  },
  get JSON() {
    return PropertyFactory({ name: '', type: 'json' })
  },
  get Date() {
    return PropertyFactory({ name: '', type: 'date' })
  },
  get Reference() {
    return {
      of <T extends Schema = Schema>(name: string) {
        return PropertyFactory<T>({
          name: '',
          type: 'reference',
          of: name as string,
        })
      },
    }
  },
  get ReversedReference() {
    function make<T extends Schema = Schema>(foreignField: string, name: string) {
      return PropertyFactory<T>({
        name: '',
        type: 'reversed-reference',
        of: name,
        on: foreignField,
      })
    }

    return {
      of<T extends Schema = Schema>(name: string) {
        return ({
          on(foreignField: string) {
            return make<T>(foreignField, name)
          },
        })
      },
      on(foreignField: string) {
        return {
          of<T extends Schema = Schema>(name: string) {
            return make<T>(foreignField, name)
          },
        }
      },
    }
  },
  get Schema() {
    return {
      of<T extends Schema = Schema>(schema: T) {
        return sanitizeSchema({ schema, name: '' }) as IPropertySchema<T>
      },
    }
  },
  get Array() {
    return {
      of<T extends SchemaField = SchemaField>(schema: T) {
        return sanitizeArray({ name: '', of: schema }) as IPropertyArray<T>
      },
    }
  },
  get Raw() {
    return {
      of: (type: string) => PropertyFactory({ type: 'raw', name: type, of: type }),
    }
  },
}

export default Types
