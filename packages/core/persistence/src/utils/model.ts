import {
  SchemaType, Field, FieldMode, FieldModeEnum, Fields, Model, Schema, SchemaEntry,
} from '@harmonyjs/types-persistence'
import Types from '../entities/schema-types'
import { extractModelType } from './types'
import { mutationResolvers, queryResolvers } from './resolvers'

export function isNestedType(nested: SchemaEntry): boolean {
  // If it's not a type, treat it as nested
  if ((!(nested instanceof SchemaType))) {
    return true
  }

  // If it's an array or a map, check the element type
  if (nested.type === 'array' || nested.type === 'map') {
    return isNestedType(nested.of)
  }

  return false
}
export function extractNestedType(nested: SchemaEntry): Schema {
  // If it's not a type, treat it as nested
  if ((!(nested instanceof SchemaType))) {
    return nested
  }

  // If it's an array or a map, check the element type
  if (nested.type === 'array' || nested.type === 'map') {
    return extractNestedType(nested.of)
  }

  return null
}

function sanitizeSchema(schema: Schema, name ?: string) {
  // Sanitize arrays
  Object.entries(schema)
    .forEach(([key, type]: [string, SchemaEntry]) => {
      if (Array.isArray(type)) {
        schema[key] = Types.Array.of(type[0])   // eslint-disable-line
      }

      if (type.type === 'map' && Array.isArray(type.of)) {
        type.of = Types.Array.of(type.of[0])    // eslint-disable-line
      }
    })

  // Delete wrong values
  Object.entries(schema)
    .forEach(([key, type]: [string, SchemaEntry]) => {
      if (!(type instanceof Object) || (type.type === 'array' && !(type.of instanceof Object))) {
        console.warn(`Schema definitions should be objects: check property ${key} of ${name}`)
        delete schema[key]  // eslint-disable-line
      }
    })

  // Check deeply
  Object.entries(schema)
    .forEach(([key, type]: [string, SchemaEntry]) => {
      if (isNestedType(type)) {
        sanitizeSchema(type.of || type, `${name}.${key}`)
      }
    })
}

/* eslint-disable no-param-reassign */
function extendField(field: Field, modelName: string) {
  switch (field.extends) {
    case 'get':
    case 'read': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}`)
      field.args = {
        filter: new SchemaType('raw', `${extractModelType(modelName)}InputFilter`),
        skip: Types.Number,
        sort: Types.Number,
      }
      break
    }
    case 'list':
    case 'readMany': {
      field.type = Types.Array.of(new SchemaType('raw', `${extractModelType(modelName)}`))
      field.args = {
        filter: new SchemaType('raw', `${extractModelType(modelName)}InputFilter`),
        skip: Types.Number,
        limit: Types.Number,
        sort: Types.Number,
      }
      break
    }
    case 'count': {
      field.type = Types.Number
      field.args = {
        filter: new SchemaType('raw', `${extractModelType(modelName)}InputFilter`),
      }
      break
    }
    case 'create': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}Payload`)
      field.args = {
        record: new SchemaType('raw', `${extractModelType(modelName)}Input!`),
      }
      break
    }
    case 'createMany': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}PayloadMany`)
      field.args = {
        records: Types.Array.of(new SchemaType('raw', `${extractModelType(modelName)}Input!`)),
      }
      break
    }
    case 'update': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}Payload`)
      field.args = {
        record: new SchemaType('raw', `${extractModelType(modelName)}InputWithID!`),
      }
      break
    }
    case 'updateMany': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}PayloadMany`)
      field.args = {
        records: Types.Array.of(new SchemaType('raw', `${extractModelType(modelName)}InputWithID!`)),
      }
      break
    }
    case 'delete': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}Payload`)
      field.args = {
        _id: Types.ID.required,
      }
      break
    }
    case 'deleteMany': {
      field.type = new SchemaType('raw', `${extractModelType(modelName)}PayloadMany`)
      field.args = {
        records: Types.Array.of(Types.ID.required),
      }
      break
    }
    default:
      break
  }
}
/* eslint-enable no-param-reassign */

function sanitizeField(field: Field, name: string, modelName: string) {
  if (field.extends) {
    extendField(field, modelName)
  }

  if (!(field.type instanceof SchemaType) && field.type) {
    sanitizeSchema(field.type, name)
  }

  if (!field.mode) {
    field.mode = [FieldMode.OUTPUT] // eslint-disable-line
  }

  if (!Array.isArray(field.mode)) {
    field.mode = [field.mode] // eslint-disable-line
  }
}


function sanitizeFields(fields: Fields, name: string, force?: FieldModeEnum) {
  Object.entries(fields || {})
    .forEach(([key, field]: [string, Field]) => {
      if (force !== undefined) {
        field.mode = force // eslint-disable-line
      }

      sanitizeField(field, `${name}.${key}`, name)
    })
}

export function sanitizeModel(model: Model) {
  sanitizeSchema(model.schema, model.name)


  /* eslint-disable no-param-reassign */
  if (!model.fields) {
    model.fields = {
      fields: {},
      queries: {},
      mutations: {},
    }
  }

  if (!model.external) {
    model.fields.queries = model.fields.queries || {}
    model.fields.mutations = model.fields.mutations || {}

    queryResolvers.forEach((query) => {
      model.fields.queries[model.name + query.suffix] = model.fields.queries[model.name + query.suffix] || {
        extends: query.type,
        resolve: null,
      }
    })
    mutationResolvers.forEach((query) => {
      model.fields.mutations[model.name + query.suffix] = model.fields.mutations[model.name + query.suffix] || {
        extends: query.type,
        resolve: null,
      }
    })
    /* eslint-enable no-param-reassign */
  }

  sanitizeFields(model.fields.fields, model.name)
  sanitizeFields(model.fields.queries, model.name, FieldMode.OUTPUT)
  sanitizeFields(model.fields.mutations, model.name, FieldMode.OUTPUT)

  return model
}
