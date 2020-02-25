import { ILogger } from '@harmonyjs/logger'
import { Adapter, IAdapter } from '@harmonyjs/types-persistence'

import Couchbase from 'couchbase'
import uuid from 'uuid/v1'

import { toMongoDottedObject } from 'utils/query'
import { N1QLBuilders, createN1QLBuilders } from 'utils/n1ql'

import AdapterCouchbaseConfiguration from 'configuration'

type LocalVariables = {
  logger: ILogger,
  bucket: Couchbase.Bucket,
  builders: N1QLBuilders,
}

// TODO implement events
const AdapterCouchbase : Adapter<AdapterCouchbaseConfiguration> = function AdapterCouchbase(config) {
  const local : LocalVariables = {} as LocalVariables

  const instance : IAdapter = ({
    name: 'AdapterCouchbase',

    async initialize({ logger }) {
      local.logger = logger

      logger.info('Initializing Couchbase Adapter')

      const cluster = new Couchbase.Cluster(config.host)
      if (config.credentials) {
        cluster.authenticate(config.credentials.login, config.credentials.password)
      }
      local.bucket = cluster.openBucket(config.bucket)
      local.bucket.manager().createPrimaryIndex(() => {
        logger.info('Couchbase Adapter successfully initialized')
      })

      local.builders = createN1QLBuilders({ config })
    },

    // References
    async resolveRef({
      source, fieldName,
    }) {
      if (!source || !source[fieldName]) {
        return null
      }

      return new Promise<Record<string, any> | null>((resolve, reject) => {
        local.bucket.get(source[fieldName], (error, result) => {
          if (error) {
            return reject(error)
          }

          if (!result.value) {
            return resolve(null)
          }

          return resolve({
            _id: source[fieldName],
            ...result.value,
          })
        })
      })
    },

    async resolveRefs({
      source, fieldName,
    }) {
      if (!source || !source[fieldName]) {
        return []
      }

      const _ids : string[] = Array.isArray(source[fieldName]) ? source[fieldName] : [source[fieldName]]

      return new Promise((resolve, reject) => {
        local.bucket.getMulti(_ids, (error, result) => {
          if (error) {
            return reject(error)
          }

          if (!result) {
            return resolve([])
          }

          return resolve(result.map((value, index) => ({
            _id: source[fieldName][index],
            ...value,
          })))
        })
      })
    },


    // Queries
    async read({
      args, model,
    }) {
      const queryString = () => {
        try {
          const typeClause = local.builders.buildTypeClause(model)
          const filterClause = local.builders.buildFilterClause(args.filter)
          const skipClause = (args.skip) ? `OFFSET ${args.skip}` : ''
          const limitClause = 'LIMIT 1'
          const orderByClause = 'ORDER BY id'

          return local.builders.buildQueryString(
            `SELECT ${config.bucket}.*, meta().id`,
            [
              typeClause,
              filterClause,
              orderByClause,
              skipClause,
              limitClause,
            ],
          )
        } catch (err) {
          local.logger.error(err.message)
          throw err
        }
      }

      return new Promise<any>(
        (resolve, reject) => local.bucket.query(
          Couchbase.N1qlQuery.fromString(queryString()),
          (err, rows : any[]) => {
            if (err) {
              return reject(err)
            }

            return resolve(rows.map((row) => ({ ...row, _id: row.id }))[0])
          },
        ),
      )
    },

    async readMany({
      args, model,
    }) {
      const queryString = () => {
        try {
          const typeClause = local.builders.buildTypeClause(model)
          const filterClause = local.builders.buildFilterClause(args.filter)
          const skipClause = (args.skip) ? `OFFSET ${args.skip}` : ''
          const limitClause = (args.limit) ? `LIMIT ${args.limit}` : ''
          const orderByClause = (skipClause || limitClause) ? 'ORDER BY id' : ''
            + ''
          return local.builders.buildQueryString(
            `SELECT ${config.bucket}.*, meta().id`,
            [
              typeClause,
              filterClause,
              orderByClause,
              skipClause,
              limitClause,
            ],
          )
        } catch (err) {
          local.logger.error(err.message)
          throw err
        }
      }

      return new Promise<any[]>(
        (resolve, reject) => local.bucket.query(
          Couchbase.N1qlQuery.fromString(queryString()),
          (err, rows : any[]) => {
            if (err) {
              return reject(err)
            }

            return resolve(rows.map((row) => ({ ...row, _id: row.id })))
          },
        ),
      )
    },

    async count({
      args, model,
    }) {
      const queryString = () => {
        try {
          const typeClause = local.builders.buildTypeClause(model)
          const filterClause = `${local.builders.buildFilterClause(args.filter)}`
          return local.builders.buildQueryString(
            'SELECT COUNT(meta().id)',
            [
              typeClause,
              filterClause,
            ],
          )
        } catch (err) {
          local.logger.error(err.message)
          throw err
        }
      }

      return new Promise<number>(
        (resolve, reject) => local.bucket.query(
          Couchbase.N1qlQuery.fromString(queryString()),
          (err, rows : any[]) => {
            if (err) {
              return reject(err)
            }

            return resolve(rows[0].$1)
          },
        ),
      )
    },


    // Mutations
    async create({
      args, model,
    }) {
      const { _id, ...record } = args.record

      if (config.identifiers.channels) {
        record.channels = record.channels || []
        record.channels.push(model.name)
      }

      if (config.identifiers.field) {
        record[config.identifiers.field] = model.name
      }

      const key = _id || uuid()

      return new Promise((resolve, reject) => {
        local.bucket.get(key, (error, result) => {
          if (result && result.value) {
            reject(new Error(`Document already exists with id ${key}`))
          }

          return local.bucket.upsert(key, record, (err) => {
            if (err) {
              return reject(err)
            }

            return local.bucket.get(key, (e, res) => {
              if (e) {
                return reject(e)
              }

              return resolve({
                _id: key,
                ...res.value,
              })
            })
          })
        })
      })
    },

    async createMany({
      source, args, context, info, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const created : Array<any> = await Promise.all(records.map((record : any) => instance.create({
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
      args,
    }) {
      const update = toMongoDottedObject(args.record)
      delete update._id

      const mutation = Object.entries(update)
        .reduce(
          (mut, field) => mut.upsert(field[0], field[1], true),
          (local.bucket as any).mutateIn(args.record._id), // TODO type back to Bucket
        )

      return new Promise((resolve, reject) => {
        mutation.execute((err : Couchbase.CouchbaseError, frag : any) => { // TODO correctly type fragment
          if (err) {
            if (err.code === Couchbase.errors.checkResults) {
              for (let i = 0; i < Object.keys(update).length; i += 1) {
                try {
                  frag.contentByIndex(i)
                } catch (e) {
                  return reject(new Error(`Error for index ${i}: ${e.message}`))
                }
              }
            } else {
              return reject(new Error(`Top-level document error: ${err.message}`))
            }
          }

          return local.bucket.get(args.record._id, (error, result) => {
            if (error) {
              return reject(error)
            }

            return resolve({
              _id: args.record._id,
              ...result.value,
            })
          })
        })
      })
    },

    async updateMany({
      source, args, context, info, model,
    }) {
      const records = Array.isArray(args.records) ? args.records : [args.records]

      const updated : Array<any> = await Promise.all(records.map((record : any) => instance.update({
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
      args,
    }) {
      if (!args || !args._id) {
        return null
      }

      return new Promise((resolve, reject) => {
        local.bucket.get(args._id, (error, result) => {
          if (error) {
            return reject(error)
          }

          return local.bucket.remove(args._id, (err) => {
            if (err) {
              return reject(err)
            }

            return resolve({
              _id: args._id,
              ...result.value,
            })
          })
        })
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

export default AdapterCouchbase
