export default class Accessor {
  name: string = 'Accessor'

  async initialize({ models, events, logger }) {
    return null
  }

  // References
  async resolveRef({
    source, args, context, info, model, fieldName,
  }) {
    return {}
  }

  async resolveRefs({
    source, args, context, info, model, fieldName,
  }) {
    return []
  }

  // Queries
  async read({
    source, args, context, info, model,
  }) {
    return {}
  }

  async readMany({
    source, args, context, info, model,
  }) {
    return []
  }

  async count({
    source, args, context, info, model,
  }) {
    return 0
  }


  // Mutations
  async create({
    source, args, context, info, model,
  }) {
    return {}
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
    return {}
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
    return {}
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
