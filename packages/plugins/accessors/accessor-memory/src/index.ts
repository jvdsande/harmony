import { Accessor } from '@harmonyjs/types-persistence'

export default class AccessorMemory extends Accessor {
  public name = 'AccessorMemory'

  constructor(private store) {
    super()
  }

  async initialize({ models, events, logger }) {
    logger.info('Initializing Memory Accessor with store', this.store)

    return null
  }

  // Queries
  async read({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    return this.store[model.name][args.filter._id]
  }

  async readMany({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    return args.filter._ids.map((id) => this.store[model.name][id])
  }

  async count({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    let count = 0
    if (args.filter._id && this.store[model.name][args._id]) {
      count = 1
    }

    if (args._ids) {
      count += args.filter._ids.filter((id) => this.store[model.name][id]).length
    }

    return count
  }


  // Mutations
  async create({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    let id = Math.floor(Math.random() * 10000)
    while (this.store[model.name][id]) {
      id = Math.floor(Math.random() * 10000)
    }

    this.store[model.name][id] = {
      _id: id,
      ...args.record,
    }

    return {
      recordId: id,
      record: this.store[model.name][id],
    }
  }

  async createMany({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    const created : Array<any> = await Promise.all(args.records.map((record) => this.create({
      source,
      context,
      info,
      model,
      args: {
        record,
      },
    })))

    return ({
      records: created.map((c) => c.record),
      recordIds: created.map((c) => c.recordId),
    })
  }

  async update({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    this.store[model.name][args.record._id] = {
      ...this.store[model.name][args.record._id],
      ...args.record,
    }

    return {
      record: args.record,
      recordId: args.record._id,
    }
  }

  async updateMany({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
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
    this.store[model.name] = this.store[model.name] || {}
    const record = this.store[model.name][args._id]
    delete this.store[model.name][args._id]
    return {
      recordId: record._id,
      record,
    }
  }

  async deleteMany({
    source, args, context, info, model,
  }) {
    this.store[model.name] = this.store[model.name] || {}
    const deleted : Array<any> = await Promise.all(args.records.map((record) => this.delete({
      source,
      context,
      info,
      model,
      args: {
        record,
      },
    })))

    return ({
      records: deleted.map((c) => c.record),
      recordIds: deleted.map((c) => c.recordId),
    })
  }
}
