import {
  SchemaTypes, SchemaType, SchemaDefinition, SchemaTypeOpts,
} from 'mongoose'

import {
  IProperty, IPropertyArray, IPropertySchema, SanitizedModel,
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

function toMongooseType(prop : IProperty, models : SanitizedModel[]) : SchemaType | SchemaDefinition {
  if (['nested', 'array', 'map'].includes(prop.type)) {
    return toMongooseSchema(prop, models) // eslint-disable-line
  }

  if (prop.type === 'reference') {
    return {
      type: models.find((m) => m.name === prop.of as string) ? SchemaTypes.ObjectId : SchemaTypes.String,
      ref: prop.of as string,
      index: prop.isIndexed,
      unique: prop.isUnique,
    } as SchemaTypeOpts<typeof SchemaTypes.ObjectId>
  }

  return {
    type: MongooseTypeMap[prop.type as string] || SchemaTypes.Mixed,
    unique: prop.isUnique,
    index: prop.isIndexed,
  } as SchemaTypeOpts<typeof SchemaTypes.Mixed>
}

// eslint-disable-next-line import/prefer-default-export
export function toMongooseSchema(schema : IProperty, models : SanitizedModel[]) : SchemaDefinition {
  const mongooseSchema : SchemaDefinition = {}

  if (['schema', 'array'].includes(schema.type)) {
    Object.entries((schema as IPropertySchema|IPropertyArray).of || {})
      .forEach(([key, prop] : [string, IProperty]) => {
        if (prop.type === 'schema') {
          mongooseSchema[key] = toMongooseSchema(prop, models)
        } else if (prop.type === 'array') {
          mongooseSchema[key] = [toMongooseSchema(prop.of as IProperty, models)]
        } else {
          mongooseSchema[key] = toMongooseType(prop, models)
        }
      })
  } else {
    return toMongooseType(schema, models) as SchemaDefinition
  }

  return mongooseSchema
}
