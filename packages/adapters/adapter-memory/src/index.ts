import { Adapter } from '@harmonyjs/types-persistence'

export * from 'types'

/* eslint-disable no-param-reassign */
const AdapterMemory : Adapter<{ store: Record<string, any>}> = function AdapterMemory({ store = {} }) {
  return ({
    name: 'AdapterMemory',

    async initialize({ logger }) {
      logger.info('Initializing Memory Adapter with store', store)
    },

    async close() {
      // Nothing to close
    },

    // Batch
    async resolveBatch({
      model, fieldName, keys,
    }) {
      return Object.keys(store[model.name]).filter((id) => {
        const doc = store[model.name][id]

        return Array.isArray(doc[fieldName])
          ? (doc[fieldName].filter((key) => keys.includes(key)).length > 0)
          : (keys.includes(doc[fieldName]))
      })
        .map((k) => store[model.name][k])
    },

    // Queries
    async read({
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      return store[model.name][args.filter._id]
    },

    async readMany({
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      return args.filter._ids.map((id) => store[model.name][id])
    },

    async count({
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      let count = 0
      if (args.filter._id && store[model.name][args.filter._id]) {
        count = 1
      }

      if (args.filter._ids) {
        count += args.filter._ids.filter((id) => store[model.name][id]).length
      }

      return count
    },


    // Mutations
    async create({
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      let id = Math.floor(Math.random() * 10000)
      while (store[model.name][id]) {
        id = Math.floor(Math.random() * 10000)
      }

      store[model.name][id] = {
        _id: id,
        ...args.record,
      }

      return store[model.name][id]
    },

    async createMany({
      source, args, context, info, model,
    }) {
      store[model.name] = store[model.name] || {}
      const records = Array.isArray(args.records) ? args.records : [args.records]
      const created: Array<any> = await Promise.all(records.map((record) => this.create({
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
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      store[model.name][args.record._id] = {
        ...store[model.name][args.record._id],
        ...args.record,
      }

      return store[model.name][args.record._id]
    },

    async updateMany({
      source, args, context, info, model,
    }) {
      store[model.name] = store[model.name] || {}
      const records = Array.isArray(args.records) ? args.records : [args.records]
      const updated: Array<any> = await Promise.all(records.map((record) => this.update({
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
      args, model,
    }) {
      store[model.name] = store[model.name] || {}
      const record = store[model.name][args._id]
      delete store[model.name][args._id]
      return record
    },

    async deleteMany({
      source, args, context, info, model,
    }) {
      store[model.name] = store[model.name] || {}

      const _ids = Array.isArray(args._ids) ? args._ids : [args._ids]

      const deleted: Array<any> = await Promise.all(_ids.map((_id) => this.delete({
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
}

export default AdapterMemory
