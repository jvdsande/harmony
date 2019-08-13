import Types, { SchemaType } from '../entities/schema-types'
import {
  Field, FieldMode, Fields, Model, Schema, SchemaEntry,
} from '../entities/model'

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

function sanitizeField(field: Field, name: string) {
  if (!(field.type instanceof SchemaType)) {
    sanitizeSchema(field.type, name)
  }

  if (!field.mode) {
    field.mode = [FieldMode.OUTPUT] // eslint-disable-line
  }

  if (!Array.isArray(field.mode)) {
    field.mode = [field.mode] // eslint-disable-line
  }
}


function sanitizeFields(fields: Fields, name: string) {
  Object.entries(fields || {})
    .forEach(([key, field]: [string, Field]) => {
      sanitizeField(field, `${name}.${key}`)
    })
}

export function sanitizeModel(model: Model) {
  sanitizeSchema(model.schema, model.name)

  if (model.fields) {
    sanitizeFields(model.fields.fields, model.name)
    sanitizeFields(model.fields.queries, model.name)
    sanitizeFields(model.fields.mutations, model.name)
  }

  return model
}
