import {
  IAccessor, IAccessorQueryBuilder, IAccessorMutationBuilder,
  IAccessorCountBuilder, IAccessorReadBuilder, IAccessorManyReadBuilder,
  IAccessorCreationBuilder, IAccessorDeletionBuilder, IAccessorManyCreationBuilder, IAccessorManyDeletionBuilder,
  IAccessorManyUpdateBuilder, IAccessorUpdateBuilder,
  IAccessorUndiscriminatedQueryBuilder, IAccessorUndiscriminatedMutationBuilder, QuerySelect, QueryDefinition,
} from '@harmonyjs/types-query'
import Builder from 'builder'

import Voca from 'voca'
import Client from 'client'

export function extractModelType(name: string): string {
  return (Voca.camelCase(name))
}

const suffix = {
  read: '',
  readMany: 'List',
  count: 'Count',
  create: 'Create',
  createMany: 'CreateMany',
  update: 'Update',
  updateMany: 'UpdateMany',
  delete: 'Delete',
  deleteMany: 'DeleteMany',
}

function AccessorQueryBuilder(type: 'count', name: string, model: string): IAccessorCountBuilder
function AccessorQueryBuilder(type: 'read', name: string, model: string): IAccessorReadBuilder
function AccessorQueryBuilder(type: 'readMany', name: string, model: string): IAccessorManyReadBuilder
function AccessorQueryBuilder(
  type: 'count'|'read'|'readMany',
  name: string,
  model: string,
) : IAccessorQueryBuilder {
  const local : {
    filter?: Record<string, any>
    sort?: number
    skip?: number
    limit?: number

    selection?: QuerySelect,

    subscription: {
      active: boolean
      models: string[]
      cached: string,
      callbacks: Function[]
    }
  } = {
    subscription: {
      active: false,
      cached: '',
      callbacks: [],
      models: [model],
    },
  }

  function promise() : Promise<Record<string, any>> {
    return Builder()
      .withName(name + suffix[type])
      .withSelection(local.selection || { _id: true })
      .withArgs({
        filter: local.filter,
        sort: local.sort,
        skip: local.skip,
        limit: local.limit,
      })
      .asQuery()
  }

  async function subscription(force: boolean) {
    const result = await promise()
    const cached = JSON.stringify(result)

    if (force || cached !== local.subscription.cached) {
      local.subscription.callbacks.forEach((callback) => callback(result))
    }

    local.subscription.cached = cached
  }

  function updateSubscription(unsubscribe ?: boolean) {
    if (unsubscribe || !local.subscription.active) {
      local.subscription.models.forEach((m) => {
        Client.unsubscribe(`${m.toLowerCase()}-updated`, subscription)
      })
    } else {
      local.subscription.models.forEach((m) => {
        Client.subscribe(`${m.toLowerCase()}-updated`, subscription)
      })
    }

    if (local.subscription.active) {
      subscription(true)
    }
  }

  const instance : IAccessorUndiscriminatedQueryBuilder = {
    where(filter) {
      local.filter = filter
      updateSubscription()
      return instance
    },
    sort(sort) {
      local.sort = sort
      updateSubscription()
      return instance
    },
    skip(skip) {
      local.skip = skip
      updateSubscription()
      return instance
    },
    limit(limit) {
      local.limit = limit
      updateSubscription()
      return instance
    },

    select(selection) {
      local.selection = selection
      updateSubscription()
      return instance
    },

    subscribe(callback) {
      if (!local.subscription.callbacks.includes(callback)) {
        local.subscription.callbacks.push(callback)
      }

      local.subscription.active = true
      updateSubscription()

      return instance
    },
    unsubscribe(callback) {
      if (local.subscription.callbacks.includes(callback)) {
        local.subscription.callbacks.splice(local.subscription.callbacks.indexOf(callback), 1)
      }

      local.subscription.active = local.subscription.callbacks.length > 0
      updateSubscription()

      return instance
    },
    listen(models) {
      updateSubscription(true)
      local.subscription.models = [...models, model]
      updateSubscription()

      return instance
    },

    then(callback) {
      return promise().then(callback)
    },
    catch(callback) {
      return promise().catch(callback)
    },
    finally(callback) {
      return promise().finally(callback)
    },
  }

  return instance
}
function AccessorMutationBuilder(type: 'create', name: string): IAccessorCreationBuilder
function AccessorMutationBuilder(type: 'createMany', name: string): IAccessorManyCreationBuilder
function AccessorMutationBuilder(type: 'update', name: string): IAccessorUpdateBuilder
function AccessorMutationBuilder(type: 'updateMany', name: string): IAccessorManyUpdateBuilder
function AccessorMutationBuilder(type: 'delete', name: string): IAccessorDeletionBuilder
function AccessorMutationBuilder(type: 'deleteMany', name: string): IAccessorManyDeletionBuilder
function AccessorMutationBuilder(
  type: 'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany',
  name: string,
) : IAccessorMutationBuilder {
  const local : {
    id?: string
    ids?: string[]
    record?: Record<string, any>
    records?: Record<string, any>[]

    selection?: QuerySelect,
  } = {}

  function promise() : Promise<Record<string, any>> {
    if ((type === 'update' || type === 'create') && !local.record) {
      throw new Error(`You need a record to call ${type}. Use withRecord(record)`)
    }
    if (type === 'update' && local.record && !local.record._id) {
      throw new Error('You need a record ID to call update. Use withId(id)')
    }
    if ((type === 'updateMany' || type === 'createMany') && !local.records) {
      throw new Error(`You need records to call ${type}. Use withRecords(records)`)
    }
    if (type === 'updateMany' && local.records && !!local.records.find((r) => !r._id)) {
      throw new Error('Records need to have IDs to call updateMany.')
    }
    if (type === 'delete' && !local.id) {
      throw new Error('You need an id to call delete. Use withId(id)')
    }
    if (type === 'deleteMany' && !local.ids) {
      throw new Error('You need ids to call deleteMany. Use withIds(ids)')
    }

    return Builder()
      .withName(name + suffix[type])
      .withSelection(local.selection || { _id: true })
      .withArgs({
        _id: local.id,
        _ids: local.ids,
        record: local.record,
        records: local.records,
      })
      .asMutation()
  }

  const instance : IAccessorUndiscriminatedMutationBuilder = {
    withId(id) {
      if (type === 'update') {
        if (id) {
          local.record = {
            ...(local.record || {}),
            _id: id,
          }
        }
      } else {
        local.id = id
      }
      return instance
    },
    withIds(...ids : string[]|string[][]) {
      if (Array.isArray(ids[0])) {
        local.ids = ids[0] as string[]
      } else {
        local.ids = ids as string[]
      }
      return instance
    },
    withRecord(record) {
      const id = local.record && local.record._id
      local.record = record
      return instance.withId(id)
    },
    withRecords(...records : Record<string, any>[]|Record<string, any>[][]) {
      if (Array.isArray(records[0])) {
        local.records = records[0] as Record<string, any>[]
      } else {
        local.records = records as Record<string, any>[]
      }
      return instance
    },

    select(selection) {
      local.selection = selection
      return instance
    },

    then(callback) {
      return promise().then(callback)
    },
    catch(callback) {
      return promise().catch(callback)
    },
    finally(callback) {
      return promise().finally(callback)
    },
  }

  return instance
}

export function Accessor(model: string) : IAccessor {
  const name = extractModelType(model)

  const instance : IAccessor = {
    query: {
      get read() {
        return AccessorQueryBuilder('read', name, model)
      },
      get find() {
        return instance.query.read
      },
      get get() {
        return instance.query.read
      },

      get readMany() {
        return AccessorQueryBuilder('readMany', name, model)
      },
      get list() {
        return instance.query.readMany
      },

      get count() {
        return AccessorQueryBuilder('count', name, model)
      },
    },

    mutate: {
      get create() {
        return AccessorMutationBuilder('create', name)
      },
      get createMany() {
        return AccessorMutationBuilder('createMany', name)
      },
      get update() {
        return AccessorMutationBuilder('update', name)
      },
      get updateMany() {
        return AccessorMutationBuilder('updateMany', name)
      },
      get delete() {
        return AccessorMutationBuilder('delete', name)
      },
      get deleteMany() {
        return AccessorMutationBuilder('deleteMany', name)
      },
    },
  }

  return instance
}
