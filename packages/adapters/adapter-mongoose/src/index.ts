import Mongoose, { Connection, SchemaType, SchemaTypes } from 'mongoose'
import Voca from 'voca'
import { GraphQLObjectId } from 'graphql-objectid-scalar'

import { ILogger } from '@harmonyjs/logger'

import {
  Adapter, IAdapter, IEvents, IPropertySchema, SanitizedModel,
} from '@harmonyjs/types-persistence'

import { AdapterMongooseConfiguration } from 'configuration'

import { toMongoDottedObject } from 'utils/query'
import { toMongooseSchema } from 'utils/schema'
import { sanitizeFilter, buildPopulatedQuery } from 'utils/sanitize'

export * from 'types'

Mongoose.Promise = global.Promise

type LocalVariables = {
  logger: ILogger
  schemas: Record<string, IPropertySchema>
  externals: Record<string, boolean>
}

type ExposedVariables = {
  models: Record<string, Mongoose.Model<any>>
  connection: Connection
}

const AdapterMongoose : Adapter<AdapterMongooseConfiguration, ExposedVariables> = function AdapterMongoose(config) {
  const local : LocalVariables = {
    schemas: {},
    externals: {},
  } as LocalVariables

  const instance : IAdapter<Mongoose.Types.ObjectId> & ExposedVariables = ({
    name: 'AdapterMongoose',
    models: {},
    connection: Mongoose.createConnection(),

    scalar: GraphQLObjectId,

    async initialize({ models, events, logger } : {
      models: SanitizedModel[],
      events: IEvents,
      logger: ILogger,
    }) {
      local.logger = logger

      logger.info('Initializing Mongoose Adapter')
      logger.info('Converting Schemas')

      // Convert Persistence Models to Mongoose Schemas
      const schemas : Record<string, Mongoose.Schema> = {}

      // Retrieve local adapter name from first model
      const adapterName = models[0] && models[0].adapter

      const extractCollectionName = config.extractCollectionName || Voca.kebabCase
      const extractAdapterType = config.extractMongooseType || ((adapter: string) : typeof SchemaType => {
        if (adapter === adapterName) {
          return SchemaTypes.ObjectId
        }

        return SchemaTypes.String
      })

      models.forEach((model : SanitizedModel) => {
        const schema = new Mongoose.Schema(toMongooseSchema(model.schemas.main, extractAdapterType))
        local.schemas[model.name] = model.schemas.main
        local.externals[model.name] = model.external

        const updateHook = (document : Record<string, any>, next : Function) => {
          events.updated({
            model,
            document,
          })
          next()
        }

        const removeHook = (document : Record<string, any>, next : Function) => {
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

      logger.info('Creating Mongoose models')

      // Convert Mongoose Schemas to Mongoose models
      models.forEach((model) => {
        instance.models[model.name] = instance.connection.model(extractCollectionName(model.name), schemas[model.name])
      })

      const connectToMongo = () => {
        logger.info('Connecting to MongoDB')

        instance.connection.openUri(
          config.host,
          {
            useNewUrlParser: true,
            useCreateIndex: true,
            useFindAndModify: false,
            useUnifiedTopology: true,

            dbName: config.database,

            user: config.credentials ? config.credentials.login : undefined,
            pass: config.credentials ? config.credentials.password : undefined,

            connectTimeoutMS: 5000,

            ...(config.mongooseConfig || {}),
          },
        )
          .then(() => {
            logger.info('Mongoose Adapter successfully initialized')
          })
          .catch((err) => {
            logger.error(err)
          })
      }

      connectToMongo()

      instance.connection.on('error', () => {
        logger.error('An error occurred with MongoDB connection')
        setTimeout(connectToMongo, config.connectionRetryTimeout || 5000)
      })

      instance.connection.on('disconnected', () => {
        logger.error('Mongo connection lost')
      })

      instance.connection.on('connected', () => {
        logger.info('Mongo connected')
      })
    },

    async close() {
      if (instance.connection) {
        instance.connection.removeAllListeners('connected')
        instance.connection.removeAllListeners('disconnected')
        instance.connection.removeAllListeners('error')
        await instance.connection.close()
      }
    },

    // Batch
    async resolveBatch({
      model, fieldName, keys,
    }) {
      const mongooseModel = instance.models[model.name]
      return mongooseModel.find({ [fieldName]: { $in: keys } }).lean()
    },


    // Queries
    async read({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      const filter = Object.keys(args.filter || {}).length ? sanitizeFilter(args.filter) : undefined

      // TODO add sort support
      return buildPopulatedQuery({
        query: mongooseModel
          .findOne(filter || {})
          .skip(args.skip || 0),
      })
    },

    async readMany({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      const filter = Object.keys(args.filter || {}).length ? sanitizeFilter(args.filter) : undefined

      // TODO add sort support
      return buildPopulatedQuery({
        query: mongooseModel
          .find(filter || {})
          .limit(args.limit || 0)
          .skip(args.skip || 0),
      })
    },

    async count({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      const filter = Object.keys(args.filter || {}).length ? sanitizeFilter(args.filter) : undefined

      return mongooseModel.countDocuments(filter || {})
    },


    // Mutations
    async create({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      const recordDotted = toMongoDottedObject(args.record)

      Object.keys(recordDotted).forEach((field) => {
        if (recordDotted[field] === null) {
          delete recordDotted[field]
        }
      })

      return buildPopulatedQuery({
        query: mongooseModel
          .create(recordDotted) as any,
      })
    },

    async createMany({
      args, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const created : Array<any> = await Promise.all(records.map((record) => instance.create({
        model,
        args: {
          record,
        },
      })))

      return created
    },

    async update({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      const recordDotted = toMongoDottedObject(args.record)
      const unset : any = {}

      Object.keys(recordDotted).forEach((field) => {
        if (recordDotted[field] === null) {
          delete recordDotted[field]
          unset[field] = true
        }
      })

      if (Object.keys(unset).length) {
        recordDotted.$unset = unset
      }

      return buildPopulatedQuery({
        query: mongooseModel
          .findOneAndUpdate(
            { _id: args.record._id },
            recordDotted,
            { new: true, upsert: false },
          ),
      })
    },

    async updateMany({
      args, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const updated : Array<any> = await Promise.all(records.map((record) => instance.update({
        model,
        args: {
          record,
        },
      })))

      return updated
    },

    async delete({
      args, model,
    }) {
      const mongooseModel = instance.models[model.name]

      return buildPopulatedQuery({
        query: mongooseModel
          .findOneAndDelete(
            { _id: args._id },
          ),
      })
    },

    async deleteMany({
      args, model,
    }) {
      const _ids = Array.isArray(args._ids) ? args._ids : [args._ids]

      const deleted : Array<any> = await Promise.all(_ids.map((_id) => instance.delete({
        model,
        args: {
          _id,
        },
      })))

      return deleted
    },
  })

  return instance
}

export default AdapterMongoose
