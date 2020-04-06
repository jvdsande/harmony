import {
  IAccessor, IAccessorQueryBuilder, IAccessorMutationBuilder,
  IAccessorCountBuilder, IAccessorReadBuilder, IAccessorManyReadBuilder,
  IAccessorCreationBuilder, IAccessorDeletionBuilder, IAccessorManyCreationBuilder, IAccessorManyDeletionBuilder,
  IAccessorManyUpdateBuilder, IAccessorUpdateBuilder,
  IAccessorUndiscriminatedQueryBuilder, IAccessorUndiscriminatedMutationBuilder, QuerySelect, IClient,
} from '@harmonyjs/types-query'

import Voca from 'voca'

import Builder from 'builder'
import Client from 'client'

export function extractModelName(name: string): string {
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

function AccessorQueryBuilder<T = {[key: string]: any}>(type: 'count', name: string, model: string, client: IClient)
  : IAccessorCountBuilder<number>
function AccessorQueryBuilder<T = {[key: string]: any}>(type: 'read', name: string, model: string, client: IClient)
  : IAccessorReadBuilder<T>
function AccessorQueryBuilder<T = {[key: string]: any}>(type: 'readMany', name: string, model: string, client: IClient)
  : IAccessorManyReadBuilder<T[]>
function AccessorQueryBuilder<T = {[key: string]: any}>(
  type: 'count'|'read'|'readMany',
  name: string,
  model: string,
  client: IClient,
) : IAccessorQueryBuilder<T> {
  const local : {
    filter?: {[key: string]: any}
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

  function promise() : Promise<T> {
    return Builder<T>(client)
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
        client.unsubscribe(`${m}-updated`, subscription)
      })
    } else {
      local.subscription.models.forEach((m) => {
        client.subscribe(`${m}-updated`, subscription)
      })
    }

    if (local.subscription.active) {
      subscription(true)
    }
  }

  const instance : IAccessorUndiscriminatedQueryBuilder<T> = {
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
    listen(...models) {
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
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'create', name: string, client: IClient)
  : IAccessorCreationBuilder<T>
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'createMany', name: string, client: IClient)
  : IAccessorManyCreationBuilder<T[]>
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'update', name: string, client: IClient)
  : IAccessorUpdateBuilder<T>
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'updateMany', name: string, client: IClient)
  : IAccessorManyUpdateBuilder<T[]>
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'delete', name: string, client: IClient)
  : IAccessorDeletionBuilder<T>
function AccessorMutationBuilder<T = {[key: string]: any}>(type: 'deleteMany', name: string, client: IClient)
  : IAccessorManyDeletionBuilder<T[]>
function AccessorMutationBuilder<T>(
  type: 'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany',
  name: string,
  client: IClient,
) : IAccessorMutationBuilder<T> {
  const local : {
    id?: string
    ids?: string[]
    record?: Record<string, any>
    records?: Record<string, any>[]

    selection?: QuerySelect,
  } = {}

  function promise() : Promise<T> {
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

    return Builder<T>(client)
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

  const instance : IAccessorUndiscriminatedMutationBuilder<T> = {
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
    withRecords(...records : {[key: string]: any}[]|{[key: string]: any}[][]) {
      if (Array.isArray(records[0])) {
        local.records = records[0] as {[key: string]: any}[]
      } else {
        local.records = records as {[key: string]: any}[]
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

export function Accessor<T>(model: string, client?: IClient) : IAccessor<T> {
  const name = extractModelName(model)

  const instance : IAccessor<T> = {
    query: {
      get read() {
        return AccessorQueryBuilder<T>('read', name, model, client || Client)
      },
      get find() {
        return instance.query.read
      },
      get get() {
        return instance.query.read
      },

      get readMany() {
        return AccessorQueryBuilder<T>('readMany', name, model, client || Client)
      },
      get list() {
        return instance.query.readMany
      },

      get count() {
        return AccessorQueryBuilder<T>('count', name, model, client || Client)
      },
    },

    mutate: {
      get create() {
        return AccessorMutationBuilder<T>('create', name, client || Client)
      },
      get createMany() {
        return AccessorMutationBuilder<T>('createMany', name, client || Client)
      },
      get update() {
        return AccessorMutationBuilder<T>('update', name, client || Client)
      },
      get updateMany() {
        return AccessorMutationBuilder<T>('updateMany', name, client || Client)
      },
      get delete() {
        return AccessorMutationBuilder<T>('delete', name, client || Client)
      },
      get deleteMany() {
        return AccessorMutationBuilder<T>('deleteMany', name, client || Client)
      },
    },
  }

  return instance
}
