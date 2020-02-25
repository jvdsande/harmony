import Mongoose from 'mongoose'

import { ILogger } from '@harmonyjs/logger'
import {
  Adapter, IAdapter, IEvents, IPropertySchema, SanitizedModel,
} from '@harmonyjs/types-persistence'

import { AdapterMongooseConfiguration } from 'configuration'

import { toMongoDottedObject } from 'utils/query'
import { toMongooseSchema } from 'utils/schema'
import { sanitizeFilter, buildPopulatedQuery } from 'utils/sanitize'

Mongoose.Promise = global.Promise

type LocalVariables = {
  logger: ILogger,
  models: Record<string, Mongoose.Model<any>>,
  schemas: Record<string, IPropertySchema>,
  externals: Record<string, boolean>
}

const AdapterMongoose : Adapter<AdapterMongooseConfiguration> = function AdapterMongoose(config) {
  const local : LocalVariables = {
    models: {},
    schemas: {},
    externals: {},
  } as LocalVariables

  const instance : IAdapter = ({
    name: 'AdapterMongoose',

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

      models.forEach((model : SanitizedModel) => {
        const schema = new Mongoose.Schema(toMongooseSchema(model.schemas.main, models))
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
        local.models[model.name] = Mongoose.model(model.name, schemas[model.name])
      })

      const connectToMongo = () => {
        logger.info('Connecting to MongoDB')

        return Mongoose.connect(
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

      Mongoose.connection.on('error', () => {
        logger.error('An error occurred with MongoDB connection')
        setTimeout(connectToMongo, config.connectionRetryTimeout || 5000)
      })

      Mongoose.connection.on('disconnected', () => {
        logger.error('Mongo connection lost')
      })

      Mongoose.connection.on('connected', () => {
        logger.info('Mongo connected')
      })
    },


    // References
    async resolveRef({
      source, model, fieldName, foreignFieldName,
    }) {
      if (!source || !fieldName || !foreignFieldName) {
        return null
      }

      // Check if the ref as already been resolved beforehand
      if (!Mongoose.Types.ObjectId.isValid(source[fieldName])) {
        return source[fieldName]
      }

      const mongooseModel = local.models[model.name]
      return mongooseModel.findOne({ [foreignFieldName]: source[fieldName] }).lean()
    },

    async resolveRefs({
      source, model, fieldName, foreignFieldName,
    }) {
      if (!source || !fieldName || !foreignFieldName) {
        return []
      }

      // Check if the ref as already been resolved beforehand
      // Check if the source field is an array or undefined
      if (!source[fieldName]) {
        return source[fieldName]
      }
      if (Array.isArray(source[fieldName])) {
        // Check if the first element is not an objectId
        if (!source[fieldName].length || !(Mongoose.Types.ObjectId.isValid(source[fieldName][0]))) {
          return source[fieldName]
        }
      }

      const mongooseModel = local.models[model.name]
      return mongooseModel.find({ [foreignFieldName]: { $in: source[fieldName] } }).lean()
    },


    // Queries
    async read({
      args, info, model,
    }) {
      const mongooseModel = local.models[model.name]
      const harmonyModel = local.schemas[model.name]

      // TODO add sort support
      return buildPopulatedQuery({
        harmonyModel,
        harmonyExternals: local.externals,
        external: model.external,
        info,
        query: mongooseModel
          .findOne(sanitizeFilter(args.filter))
          .skip(args.skip || 0),
      })
    },

    async readMany({
      args, info, model,
    }) {
      const mongooseModel = local.models[model.name]
      const harmonyModel = local.schemas[model.name]

      // TODO add sort support
      return buildPopulatedQuery({
        harmonyModel,
        harmonyExternals: local.externals,
        external: model.external,
        info,
        query: mongooseModel
          .find(sanitizeFilter(args.filter))
          .limit(args.limit || 0)
          .skip(args.skip || 0),
      })
    },

    async count({
      args, model,
    }) {
      const mongooseModel = local.models[model.name]

      return mongooseModel.countDocuments(sanitizeFilter(args.filter))
    },


    // Mutations
    async create({
      args, info, model,
    }) {
      const mongooseModel = local.models[model.name]
      const harmonyModel = local.schemas[model.name]

      return buildPopulatedQuery({
        harmonyModel,
        harmonyExternals: local.externals,
        external: model.external,
        info,
        query: mongooseModel
          .create(args.record) as any,
      })
    },

    async createMany({
      source, args, context, info, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const created : Array<any> = await Promise.all(records.map((record) => instance.create({
        source,
        context,
        info,
        model,
        args: {
          record,
        },
      })))

      return created
    },

    async update({
      args, info, model,
    }) {
      const mongooseModel = local.models[model.name]
      const harmonyModel = local.schemas[model.name]

      return buildPopulatedQuery({
        harmonyModel,
        harmonyExternals: local.externals,
        external: model.external,
        info,
        query: mongooseModel
          .findOneAndUpdate(
            { _id: args.record._id },
            toMongoDottedObject(args.record),
            { new: true, upsert: false },
          ),
      })
    },

    async updateMany({
      source, args, context, info, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const updated : Array<any> = await Promise.all(records.map((record) => instance.update({
        source,
        context,
        info,
        model,
        args: {
          record,
        },
      })))

      return updated
    },

    async delete({
      args, info, model,
    }) {
      const mongooseModel = local.models[model.name]
      const harmonyModel = local.schemas[model.name]

      return buildPopulatedQuery({
        harmonyModel,
        harmonyExternals: local.externals,
        external: model.external,
        info,
        query: mongooseModel
          .findOneAndDelete(
            { _id: args._id },
          ),
      })
    },

    async deleteMany({
      source, args, context, info, model,
    }) {
      const _ids = Array.isArray(args._ids) ? args._ids : [args._ids]

      const deleted : Array<any> = await Promise.all(_ids.map((_id) => instance.delete({
        source,
        context,
        info,
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