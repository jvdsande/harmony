import {
  SchemaTypes, SchemaType, SchemaDefinition, SchemaTypeOpts,
} from 'mongoose'

import {
  IProperty, IPropertyArray, IPropertySchema,
} from '@harmonyjs/types-persistence'

const MongooseTypeMap : Record<string, typeof SchemaType> = {
  boolean: SchemaTypes.Boolean,
  date: SchemaTypes.Date,
  float: SchemaTypes.Number,
  id: SchemaTypes.ObjectId,
  json: SchemaTypes.Mixed,
  number: SchemaTypes.Number,
  string: SchemaTypes.String,
}

function toMongooseType(
  prop : IProperty,
  extractAdapterType: (adapter: string) => typeof SchemaType,
) : SchemaType | SchemaDefinition {
  if (['nested', 'array', 'map'].includes(prop.type)) {
    return toMongooseSchema(prop, extractAdapterType) // eslint-disable-line
  }

  if (prop.type === 'reference') {
    return {
      type: extractAdapterType(prop.isFor),
      ref: prop.of as string,
      index: prop.isIndexed,
      unique: prop.isUnique,
    } as SchemaTypeOpts<typeof SchemaType>
  }

  return {
    type: MongooseTypeMap[prop.type as string] || SchemaTypes.Mixed,
    unique: prop.isUnique,
    index: prop.isIndexed,
  } as SchemaTypeOpts<typeof SchemaTypes.Mixed>
}

// eslint-disable-next-line import/prefer-default-export
export function toMongooseSchema(
  schema : IProperty,
  extractAdapterType: (adapter: string) => typeof SchemaType,
) : SchemaDefinition {
  const mongooseSchema : SchemaDefinition = {}

  if (['schema', 'array'].includes(schema.type)) {
    Object.entries((schema as IPropertySchema|IPropertyArray).of || {})
      .forEach(([key, prop] : [string, IProperty]) => {
        if (prop.type === 'schema') {
          mongooseSchema[key] = toMongooseSchema(prop, extractAdapterType)
        } else if (prop.type === 'array') {
          mongooseSchema[key] = [toMongooseSchema(prop.of as IProperty, extractAdapterType)]
        } else {
          mongooseSchema[key] = toMongooseType(prop, extractAdapterType)
        }
      })
  } else {
    return toMongooseType(schema, extractAdapterType) as SchemaDefinition
  }

  return mongooseSchema
}
