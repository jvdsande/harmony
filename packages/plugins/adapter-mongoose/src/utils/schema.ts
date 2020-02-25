import Mongoose, { SchemaDefinition, SchemaTypeOpts } from 'mongoose'

import {
  IProperty, IPropertyArray, IPropertySchema, SanitizedModel,
} from '@harmonyjs/types-persistence'

const { SchemaTypes: Types } = Mongoose

const MongooseTypeMap : Record<string, typeof Mongoose.SchemaType> = {
  boolean: Types.Boolean,
  date: Types.Date,
  float: Types.Number,
  id: Types.ObjectId,
  json: Types.Mixed,
  number: Types.Number,
  string: Types.String,
}

function toMongooseType(prop : IProperty, models : SanitizedModel[]) : Mongoose.SchemaType | SchemaDefinition {
  if (['nested', 'array', 'map'].includes(prop.type)) {
    return toMongooseSchema(prop, models) // eslint-disable-line
  }

  if (prop.type === 'reference') {
    return {
      type: models.find((m) => m.name === prop.of as string) ? Types.ObjectId : Types.String,
      ref: prop.of as string,
      index: prop.isIndexed,
      unique: prop.isUnique,
    } as SchemaTypeOpts<typeof Types.ObjectId>
  }

  return {
    type: MongooseTypeMap[prop.type as string] || Types.Mixed,
    unique: prop.isUnique,
    index: prop.isIndexed,
  } as SchemaTypeOpts<typeof Types.Mixed>
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
