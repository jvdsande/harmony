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

function extractPopulatePaths({ model, info }) {
  // Construct the field selection mapping
  const fields = {}

  const extractSelections = (selections, path, schema) => {
    selections.forEach((selection) => {
      const current = [path, selection.name.value].filter((p) => !!p).join('.')

      if (schema.of[selection.name.value]) {
        fields[current] = schema.of[selection.name.value]

        if (selection.selectionSet && fields[current] && fields[current].of) {
          extractSelections(selection.selectionSet.selections, current, fields[current])
        }
      }
    })
  }

  const extractBaseSelections = (selections) => {
    selections.forEach((selection) => {
      extractSelections(selection.selectionSet.selections, '', model)
    })
  }

  extractBaseSelections(info.fieldNodes)
  // @ts-ignore
  delete fields._id

  return Object.entries(fields)
    .filter(([path, def]: [string, Property]) => def.type === 'reference')
    .map(([path]) => path)
}

function buildPopulatedQuery({
  harmonyModel,
  info,
  query,
}) {
  const populatePaths = extractPopulatePaths({ model: harmonyModel, info })

  return populatePaths
    .reduce((q, field) => q.populate(field), query.lean ? query.lean() : query)
}

export default class AccessorMongoose extends Accessor {
  public models = {}

  public schemas = {}

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
      const schema = new Mongoose.Schema(toMongooseSchema(model.originalSchema))
      this.schemas[model.name] = model.originalSchema

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

    const connectToMongo = () => {
      logger.info('Connecting to MongoDB')

      return Mongoose.connect(
        this.config.host,
        {
          useNewUrlParser: true,
          useCreateIndex: true,
          useFindAndModify: false,
          dbName: this.config.database,

          autoReconnect: true,
          reconnectTries: Number.MAX_VALUE,
          connectTimeoutMS: 5000,

          useUnifiedTopology: true,
        },
      )
        .then(() => {
          logger.info('Mongoose Accessor successfully initialized')
        })
        .catch((err) => {
          logger.error(err)
        })
    }

    connectToMongo()

    Mongoose.connection.on('error', () => {
      logger.error('An error occured with MongoDB connection')
      connectToMongo()
    })

    Mongoose.connection.on('disconnected', () => {
      logger.error('Mongo connection lost')
    })

    Mongoose.connection.on('connected', () => {
      logger.info('Mongo connected')
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
    const harmonyModel = this.schemas[model.name]

    // TODO add sort support
    return buildPopulatedQuery({
      harmonyModel,
      info,
      query: mongooseModel
        .findOne(sanitizeFilter(args.filter))
        .skip(args.skip || undefined),
    })
  }

  async readMany({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]
    const harmonyModel = this.schemas[model.name]

    // TODO add sort support
    return buildPopulatedQuery({
      harmonyModel,
      info,
      query: mongooseModel
        .find(sanitizeFilter(args.filter))
        .limit(args.limit || undefined)
        .skip(args.skip || undefined),
    })
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
    const harmonyModel = this.schemas[model.name]

    return buildPopulatedQuery({
      harmonyModel,
      info,
      query: mongooseModel
        .create(args.record),
    })
  }

  async createMany({
    source, args, context, info, model,
  }) {
    const created : Array<any> = await Promise.all(args.records.map((record) => this.create({
      source,
      context,
      info,
      model,
      args: {
        record,
      },
    })))

    return created
  }

  async update({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]
    const harmonyModel = this.schemas[model.name]

    return buildPopulatedQuery({
      harmonyModel,
      info,
      query: mongooseModel
        .findOneAndUpdate(
          { _id: args.record._id },
          toMongoDottedObject(args.record),
          { new: true, upsert: false },
        ),
    })
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

    return updated
  }

  async delete({
    source, args, context, info, model,
  }) {
    const mongooseModel = this.models[model.name]
    const harmonyModel = this.schemas[model.name]

    return buildPopulatedQuery({
      harmonyModel,
      info,
      query: mongooseModel
        .findOneAndDelete(
          { _id: args._id },
        ),
    })
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

    return deleted
  }
}
