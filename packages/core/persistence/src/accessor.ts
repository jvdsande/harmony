export default class Accessor {
  async initialize({ models }) {
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
    return {
      recordId: null,
      record: null,
    }
  }

  async createMany({
    source, args, context, info, model,
  }) {
    return {
      recordIds: [],
      records: [],
    }
  }

  async update({
    source, args, context, info, model,
  }) {
    return {
      recordId: null,
      record: null,
    }
  }

  async updateMany({
    source, args, context, info, model,
  }) {
    return {
      recordIds: [],
      records: [],
    }
  }

  async delete({
    source, args, context, info, model,
  }) {
    return {
      recordId: null,
      record: null,
    }
  }

  async deleteMany({
    source, args, context, info, model,
  }) {
    return {
      recordIds: [],
      records: [],
    }
  }
}
