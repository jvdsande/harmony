/* eslint-disable no-use-before-define */
import {
  IProperty, IPropertyArray, IPropertySchema,
  Schema, SchemaField,
} from '@harmonyjs/types-persistence'

import PropertyFactory from 'utils/property/factory'

// Get a Schema compatible field, turn it into a proper Property
export function sanitizeSchemaField({ schema, name } : { schema: SchemaField, name: string }) : IProperty {
  // Here, we can have as value :
  // - another array, which needs to be sanitized to an IPropertyArray
  // - an object, which needs to be sanitized to an IPropertySchema
  // - an IProperty, which can be kept as-is

  // Check if we are dealing with an array
  if (Array.isArray(schema)) {
    return sanitizeArray({ name, of: schema[0] })
  }

  // Check if we are dealing with an object
  if (!schema.type || (typeof schema.type !== 'string')) {
    // If the "type" does not exist or is not a string, then this is a plain object that needs sanitizing
    return sanitizeSchema({ schema: schema as Schema, name })
  }

  // Else we are dealing with a correct IProperty, so we keep it as-is
  return schema as IProperty
}

// Get a SchemaLikeValue, turn it into a proper Property and wrap it in an Array
export function sanitizeArray({ name, of } : { name: string, of: SchemaField }) {
  const sanitizedOf : IProperty = sanitizeSchemaField({ schema: of, name: '' })
  const sanitizedArray : IPropertyArray = PropertyFactory({ type: 'array', name, of: sanitizedOf })

  sanitizedOf.name = ''
  sanitizedOf.parent = sanitizedArray

  return sanitizedArray
}

// Get a Schema-like or proper Schema Property, turn it into a Schema Property and sanitize its fields names and parent
export function sanitizeSchema({ schema, name } : { schema: Schema|IPropertySchema, name: string }) : IPropertySchema {
  // If we are dealing with a proper schema, simply go through the properties to update names and parents
  if (schema.type === 'schema') {
    const propertySchema = schema as IPropertySchema

    Object.keys(propertySchema.of).forEach((key) => {
      propertySchema.of[key].name = key
      propertySchema.of[key].parent = propertySchema
    })

    return propertySchema
  }

  const sanitized : {[key: string]: IProperty} = {}
  const sanitizedProperty = PropertyFactory({ type: 'schema', name, of: sanitized })

  const fields : Schema = schema as Schema

  Object.keys(fields).forEach((key) => {
    sanitized[key] = sanitizeSchemaField({ schema: fields[key], name: key })
  })

  return sanitizeSchema({ schema: sanitizedProperty, name })
}
