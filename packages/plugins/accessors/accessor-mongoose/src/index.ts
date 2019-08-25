import {
  Accessor, Property, PropertySchema, SanitizedModel,
} from '@harmonyjs/types-persistence'

import Mongoose from 'mongoose'
import { toMongoDottedObject, toMongoFilterDottedObject } from './utils/query'

const { SchemaTypes: Types } = Mongoose
Mongoose.Promise = global.Promise

const operatorMap = {
  not: '$not',
  eq: '$eq',
  neq: '$ne',
  exists: '$exists',
  in: '$in',
  nin: '$nin',
  gte: '$gte',
  lte: '$lte',
  gt: '$gt',
  lt: '$lt',
  regex: '$regex',
  element: '$elemMatch',
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

function toMongooseType(prop : Property) {
  if (['nested', 'array', 'map'].includes(prop.type)) {
    return toMongooseSchema(prop) // eslint-disable-line
  }

  if (prop.type === 'reference') {
    return {
      type: Types.ObjectId,
      ref: prop.of as string,
      indexed: prop.isIndexed(),
      unique: prop.isUnique(),
    }
  }

  return {
    type: MongooseTypeMap[prop.type as string] || Types.Mixed,
    unique: prop.isUnique(),
    indexed: prop.isIndexed(),
  }
}

function toMongooseSchema(schema : Property) {
  const mongooseSchema = {}

  if (['nested', 'array', 'map'].includes(schema.type)) {
    Object.entries(schema.of)
      .forEach(([key, prop] : [string, Property]) => {
        if (prop.type === 'nested') {
          mongooseSchema[key] = toMongooseSchema(prop)
        } else if (prop.type === 'array') {
          mongooseSchema[key] = [toMongooseSchema(prop.of as Property)]
        } else if (prop.type === 'map') {
          mongooseSchema[key] = {
            type: Types.Map,
            of: toMongooseSchema(prop.of as Property),
            indexed: prop.isIndexed(),
            unique: prop.isUnique(),
          }
        } else {
          mongooseSchema[key] = toMongooseType(prop)
        }
      })
  } else {
    return toMongooseType(schema)
  }

  return mongooseSchema
}

function sanitizeOperators(operators) {
  const sanitized = {}

  Object.entries(operators)
    .forEach(([operator, params] : [string, PropertySchema]) => {
      sanitized[operatorMap[operator]] = params

      if (operator === 'element') {
        sanitized[operatorMap[operator]] = sanitizeOperators(params)
      }

      if (operator === 'match') {
        delete sanitized[operatorMap[operator]]

        Object.entries(params)
          .forEach(([k, p]) => {
            sanitized[k] = sanitizeOperators(p)
          })
      }
    })

  return sanitized
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
    filter._and = filter._and || [] // eslint-disable-line
    const ops = {}

    Object.entries(filter._operators)
      .forEach(([field, operators]) => {
        ops[field] = sanitizeOperators(operators)
      })

    filter._and.push(ops)
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

  return toMongoFilterDottedObject({ ...newFilter })
}

export default class AccessorMongoose extends Accessor {
  public models = {}

  public logger = null

  public name = 'AccessorMongoose'

  constructor(private config : any) {
    super()

    this.resolveRefs = this.resolveRefs.bind(this)
    this.resolveRef = this.resolveRef.bind(this)
  }

  async initialize({ models, events, logger }) {
    // Convert Persistence Models to Mongoose Schemas
    const schemas = {}

    const plugins = this.config.plugins || []
    this.logger = logger

    logger.info('Initializing Mongoose Accessor')
    logger.info('Converting Schemas')

    models.forEach((model : SanitizedModel) => {
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
    // Check if the ref as already been resolved beforehand
    if (!Mongoose.Types.ObjectId.isValid(source[fieldName])) {
      return source[fieldName]
    }

    const mongooseModel = this.models[model.name]
    return mongooseModel.findOne({ _id: source[fieldName] })
  }

  async resolveRefs({
    source, args, context, info, model, fieldName,
  }) {
    // Check if the ref as already been resolved beforehand
    if (
      !source[fieldName].length
      || (!Mongoose.Types.ObjectId.isValid(source[fieldName][0]))
    ) {
      return source[fieldName]
    }

    const mongooseModel = this.models[model.name]
    return mongooseModel.find({ _id: { $in: source[fieldName] } })
  }


  // Queries
  async read({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    // TODO parse Info to Populate
    return mongooseModel.findOne(sanitizeFilter(args.filter))
  }

  async readMany({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
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

    // TODO parse Info to Populate
    return ({
      records: deleted.map((c) => c.record),
      recordIds: deleted.map((c) => c.recordId),
    })
  }
}
