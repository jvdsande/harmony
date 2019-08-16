import { Accessor, SchemaType, SchemaEntry } from '@harmonyjs/types-persistence'

import Mongoose from 'mongoose'
import { toMongoDottedObject, toMongoFilterDottedObject } from './utils/query'

const { SchemaTypes: Types } = Mongoose
Mongoose.Promise = global.Promise

const operatorMap = {
  not: '$not',
  eq: '$eq',
  neq: '$neq',
  exists: '$exists',
  in: '$in',
  nin: '$nin',
  gte: '$gte',
  lte: '$lte',
  gt: '$gt',
  lt: '$lt',
  regex: '$regex',
  all: '$all',
  match: '$elemMatch',
}

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
      indexed: type.isIndexed,
    })
  }

  if (type.type === 'reference') {
    return ({
      type: Types.ObjectId,
      ref: type.of,
      unique: type.isUnique,
      indexed: type.isIndexed,
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

  return {
    type: MongooseTypeMap[type.type as string] || Types.Mixed,
    unique: type.isUnique,
    indexed: type.isIndexed,
  }
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

  delete newFilter._operators
  delete newFilter._or
  delete newFilter._and
  delete newFilter._nor

  if (newFilter._ids) {
    newFilter._id = { $in: newFilter._ids }
    delete newFilter._ids
  }

  if (filter._operators) {
    Object.entries(filter._operators)
      .forEach(([field, operators]) => {
        newFilter[field] = {}

        Object.entries(operators)
          .forEach(([operator, params]) => {
            newFilter[field][operatorMap[operator]] = params
          })
      })
  }

  if (filter._or) {
    newFilter.$or = filter._or.map(sanitizeFilter)
  }

  if (filter._and) {
    newFilter.$and = filter._and.map(sanitizeFilter)
  }

  if (filter._nor) {
    newFilter.$nor = filter._nor.map(filter._nor)
  }

  return toMongoFilterDottedObject(newFilter)
}

export default class AccessorMongoose extends Accessor {
  public models = {}

  public logger = null

  public name = 'AccessorMongoose'

  constructor(private config : any) {
    super()
  }

  async initialize({ models, events, logger }) {
    // Convert Persistence Models to Mongoose Schemas
    const schemas = {}

    const plugins = this.config.plugins || []
    this.logger = logger

    logger.info('Initializing Mongoose Accessor')
    logger.info('Converting Schemas')

    models.forEach((model) => {
      const schema = new Mongoose.Schema(toMongooseSchema(model.schema))

      const updateHook = (document, next) => {
        events.updated({
          model,
          document,
        })
        next()
      }

      const removeHook = (document, next) => {
        events.removed({
          model,
          document,
        })
        next()
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

      schemas[model.name] = schema
    })

    logger.info('Registering plugins')

    plugins.forEach((plugin) => plugin.initialize({
      models, schemas, events, logger,
    }))

    logger.info('Creating Mongoose models')

    // Convert Mongoose Schemas to Mongoose models
    models.forEach((model) => {
      this.models[model.name] = Mongoose.model(model.name, schemas[model.name])
    })

    logger.info('Connecting to MongoDB')

    Mongoose.connect(
      this.config.host,
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        dbName: this.config.database,
      },
    )
      .then(() => {
        logger.info('Mongoose Accessor successfully initialized')
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

    const document = await mongooseModel.create(toMongoDottedObject(args.record))

    return {
      recordId: document._id,
      record: document,
    }
  }

  async createMany({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    const documents = await mongooseModel.insertMany(toMongoDottedObject(args.records))

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
      toMongoDottedObject(args.record),
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
