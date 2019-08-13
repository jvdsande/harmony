import { Accessor, SchemaType, SchemaEntry } from '@harmonyjs/persistence'

import Mongoose from 'mongoose'

const { SchemaTypes: Types } = Mongoose
Mongoose.Promise = global.Promise

function toMongooseType(type) {
  if (!(type instanceof SchemaType)) {
    return toMongooseSchema(type) // eslint-disable-line
  }

  if (type.type === 'array') {
    return [toMongooseType(type.of)]
  }

  if (type.type === 'map') {
    return ({
      type: Types.Map,
      of: toMongooseType(type.of),
    })
  }

  if (type.type === 'reference') {
    return ({
      type: Types.ObjectId,
      ref: type.of,
    })
  }

  const MongooseTypeMap = {
    boolean: Types.Boolean,
    date: Types.Date,
    float: Types.Float,
    id: Types.ObjectId,
    json: Types.Mixed,
    number: Types.Number,
    string: Types.String,
  }

  return MongooseTypeMap[type.type as string] || Types.Mixed
}

function toMongooseSchema(schema) {
  const mongooseSchema = {}

  Object.entries(schema)
    .forEach(([key, type] : [string, SchemaEntry]) => {
      if (!(type instanceof SchemaType)) {
        mongooseSchema[key] = toMongooseSchema(type)
      } else if (type.type === 'array') {
        mongooseSchema[key] = [toMongooseType(type.of)]
      } else if (type.type === 'map') {
        mongooseSchema[key] = {
          type: Types.Map,
          of: toMongooseType(type.of),
        }
      } else if (type.type === 'reference') {
        mongooseSchema[key] = {
          type: Types.ObjectId,
          ref: type.of,
        }
      } else {
        mongooseSchema[key] = toMongooseType(type)
      }
    })

  return mongooseSchema
}

function sanitizeFilter(filter) {
  if (!filter) {
    return filter
  }

  const newFilter = { ...filter }

  if (newFilter._ids) {
    newFilter._id = { $in: newFilter._ids }
    delete newFilter._ids
  }

  // TODO: Implement AND/OR and OPERATORS

  return newFilter
}

export default class MongooseAccessor extends Accessor {
  private models = {}

  constructor(private config : any) {
    super()

    Mongoose.connect(
      config.host,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        dbName: config.database,
      },
    )
  }

  async initialize({ models, events }) {
    // Convert Persistence Models to Mongoose Models
    models.forEach((model) => {
      const schema = new Mongoose.Schema(toMongooseSchema(model.schema))

      const updateHook = (document) => {
        events.updated({
          model,
          document,
        })
      }

      const removeHook = (document) => {
        events.removed({
          model,
          document,
        })
      }

      // Create
      schema.post('save', updateHook)
      // CreateMany
      schema.post('insertMany', updateHook)
      // Update, UpdateMany
      schema.post('findOneAndUpdate', updateHook)
      // Delete, DeleteMany
      schema.post('findOneAndDelete', removeHook)

      // Other update middleware
      schema.post('update', updateHook)
      schema.post('updateOne', updateHook)
      schema.post('updateMany', updateHook)
      schema.post('remove', removeHook)
      schema.post('deleteOne', removeHook)
      schema.post('deleteMany', removeHook)
      schema.post('findOneAndRemove', removeHook)

      this.models[model.name] = Mongoose.model(model.name, schema)
    })
  }


  // References
  async resolveRef({
    source, args, context, info, model, fieldName,
  }) {
    if (source.populate) {
      await source.populate(fieldName).execPopulate()
      return source[fieldName]
    }

    const mongooseModel = this.models[model.name]
    return mongooseModel.findOne({ _id: source[fieldName] })
  }

  async resolveRefs({
    source, args, context, info, model, fieldName,
  }) {
    if (source.populate) {
      return this.resolveRef({
        source, args, context, info, model, fieldName,
      })
    }

    const mongooseModel = this.models[model.name]
    return mongooseModel.find({ _id: { $in: source[fieldName] } })
  }


  // Queries
  async read({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    return mongooseModel.findOne(sanitizeFilter(args.filter))
  }

  async readMany({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    return mongooseModel.find(sanitizeFilter(args.filter))
  }

  async count({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    return mongooseModel.countDocuments(sanitizeFilter(args.filter))
  }


  // Mutations
  async create({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    const document = await mongooseModel.create(args.record)

    return {
      recordId: document._id,
      record: document,
    }
  }

  async createMany({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    const documents = await mongooseModel.insertMany(args.records)

    return {
      recordIds: documents.map((d) => d._id),
      records: documents,
    }
  }

  async update({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    const document = await mongooseModel.findOneAndUpdate(
      { _id: args.record._id },
      args.record,
      { new: true, upsert: true },
    )

    return {
      recordId: document._id,
      record: document,
    }
  }

  async updateMany({
    source, args, context, info, model,
  }) {
    const updated : Array<any> = await Promise.all(args.records.map((record) => this.update({
      source,
      context,
      info,
      model,
      args: {
        record,
      },
    })))

    return ({
      records: updated.map((c) => c.record),
      recordIds: updated.map((c) => c.recordId),
    })
  }

  async delete({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    const document = await mongooseModel.findOneAndDelete(
      { _id: args._id },
    )

    return {
      recordId: document._id,
      record: document,
    }
  }

  async deleteMany({
    source, args, context, info, model,
  }) {
    const deleted : Array<any> = await Promise.all(args._ids.map((_id) => this.delete({
      source,
      context,
      info,
      model,
      args: {
        _id,
      },
    })))

    return ({
      records: deleted.map((c) => c.record),
      recordIds: deleted.map((c) => c.recordId),
    })
  }
}
