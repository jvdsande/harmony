/* Factories for building Properties, externally called "Types" */
import { Model, Schema, SchemaField } from '@harmonyjs/types-persistence'

import PropertyFactory from 'utils/property/factory'
import { sanitizeSchema, sanitizeArray } from 'utils/property/sanitation'

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
      of: (name: string|Model) => PropertyFactory({
        name: '',
        type: 'reference',
        of: (name as Model).name || name as string,
      }),
    }
  },
  get ReversedReference() {
    const make = (foreignField: string, name: string|Model) => PropertyFactory({
      name: '',
      type: 'reversed-reference',
      of: (name as Model).name || name as string,
      on: foreignField,
    })

    return {
      of: (name: string|Model) => ({
        on: (foreignField: string) => make(foreignField, name),
      }),
      on: (foreignField: string) => ({
        of: (name: string|Model) => make(foreignField, name),
      }),
    }
  },
  get Schema() {
    return {
      of: (schema: Schema) => sanitizeSchema({ schema, name: '' }),
    }
  },
  get Array() {
    return {
      of: (schema: SchemaField) => sanitizeArray({ name: '', of: schema }),
    }
  },
  get Raw() {
    return {
      of: (type: string) => PropertyFactory({ type: 'raw', name: type, of: type }),
    }
  },
}

export default Types
