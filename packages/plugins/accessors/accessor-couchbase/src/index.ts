import { Accessor, PropertySchema } from '@harmonyjs/types-persistence'

import Couchbase from 'couchbase'
import uuid from 'uuid/v1'

import { toMongoDottedObject, toMongoFilterDottedObject } from './utils/query'

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

const N1QLOperators = {
  $not: ['_key', 'NOT', '_value'],
  $eq: ['_key', '=', '_value'],
  $ne: ['_key', '!=', '_value'],
  $exists: ['_key', { true: 'IS NOT MISSING', false: 'IS MISSING' }],
  $in: ['_key', 'IN', '_value'],
  $nin: ['NOT', ['_key', 'IN', '_value']],
  $gte: ['_key', '>=', '_value'],
  $lte: ['_key', '<=', '_value'],
  $gt: ['_key', '>', '_value'],
  $lt: ['_key', '<', '_value'],
  $regex: ['REGEXP_CONTAINS(', '_key', ',', '_value', ')'],
  $elemMatch: null,
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

  return ({ ...newFilter })
}

export default class AccessorCouchbase extends Accessor {
  public schemas = {}

  public bucket = null

  public logger = null

  public name = 'AccessorCouchbase'

  constructor(private config : any) {
    super()

    this.resolveRefs = this.resolveRefs.bind(this)
    this.resolveRef = this.resolveRef.bind(this)
    this.read = this.read.bind(this)
    this.readMany = this.readMany.bind(this)
    this.count = this.count.bind(this)

    this.update = this.update.bind(this)
    this.updateMany = this.updateMany.bind(this)
    this.create = this.create.bind(this)
    this.createMany = this.createMany.bind(this)
    this.delete = this.delete.bind(this)
    this.deleteMany = this.deleteMany.bind(this)
  }

  buildTypeClause(model) {
    const typeFieldClause = (this.config.identifiers.field
      ? `${this.config.identifiers.field} = "${model.name}"`
      : null
    )
    const typeChannelsClause = (this.config.identifiers.channels
      ? `ANY channel IN channels SATISFIES channel = "${model.name}" END`
      : null
    )

    if (typeFieldClause || typeChannelsClause) {
      return `AND (${[typeFieldClause, typeChannelsClause].filter((c) => !!c).join(' OR ')})`
    }

    return ''
  }

  buildOperatorFieldClause(n1qlOperation, key, value, operator) {
    if (!n1qlOperation) {
      this.logger.error(`Unsupported operator on a Couchbase accessor: ${operator}`)
      throw new Error(`You are using an unsupported operator on a Couchbase accessor: ${operator}`)
    }

    const printValue = (v) => {
      if (typeof v === 'string') {
        return `"${v}"`
      }

      if (Array.isArray(v)) {
        return `[${v.map(printValue)}]`
      }

      return `${v}`
    }

    return n1qlOperation
      .map((field) => {
        if (field === '_key') {
          return key
        }
        if (field === '_value') {
          return printValue(value)
        }
        if (Array.isArray(field)) {
          return this.buildOperatorFieldClause(field, key, value, operator)
        }
        if (typeof field === 'object') {
          return field[`${value}`]
        }

        return field
      })
      .join(' ')
  }

  buildOperatorClause(key, operators) {
    return Object.entries(operators)
      .map(([operator, value]) => {
        const n1qlOperation = N1QLOperators[operator]
        return this.buildOperatorFieldClause(n1qlOperation, key, value, operator)
      })
      .join(' AND ')
  }

  buildSanitizedFilterClause(sanitizedFilter, join = 'AND') {
    if (sanitizedFilter._id) {
      // eslint-disable-next-line no-param-reassign
      sanitizedFilter['meta().id'] = sanitizedFilter._id
      // eslint-disable-next-line no-param-reassign
      delete sanitizedFilter._id
    }

    const printValue = (value) => {
      if (typeof value === 'string') {
        return `"${value}"`
      }

      if (Array.isArray(value)) {
        return `[${value.map(printValue)}]`
      }

      return `${value}`
    }

    if (Object.keys(sanitizedFilter).length) {
      let mainQuery = `${Object.entries(sanitizedFilter)
        .filter(([key]) => !['$or', '$and', '$nor'].includes(key))
        .map(([key, value]) => {
          if (typeof value === 'object') {
            return this.buildOperatorClause(key, value)
          }

          return `${key} = ${printValue(value)}`
        })
        .join(' AND ')
      }`

      // If there was an "$and" clause, add all clauses to the chain
      if (sanitizedFilter.$and) {
        const andQuery = sanitizedFilter.$and
          .map((clause) => this.buildSanitizedFilterClause(clause))
          .join(' ')
          .slice(3)

        const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

        mainQuery += `${addAnd}(${andQuery})`
      }

      // If there was an "$or" clause, add all clauses to the chain as a unique AND clause
      if (sanitizedFilter.$or) {
        const orQuery = sanitizedFilter.$or
          .map((clause) => this.buildSanitizedFilterClause(clause, 'OR'))
          .join(' ')
          .slice(3)

        const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

        mainQuery += `${addAnd}(${orQuery})`
      }

      // If there was an "$nor" clause, add all clauses to the chain as a unique AND clause
      if (sanitizedFilter.$nor) {
        const orQuery = sanitizedFilter.$nor
          .map((clause) => this.buildSanitizedFilterClause(clause, 'OR'))
          .join(' ')
          .slice(3)

        const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

        mainQuery += `${addAnd} NOT (${orQuery})`
      }

      return `${join} (${mainQuery})`
    }

    return ''
  }

  buildFilterClause(filter) {
    if (!filter) {
      return ''
    }

    const sanitizedFilter = toMongoFilterDottedObject(sanitizeFilter(filter))

    return this.buildSanitizedFilterClause(sanitizedFilter)
  }

  buildQueryString(type, clauses) {
    return `
          ${type} FROM \`${this.config.bucket}\` WHERE 1=1 ${clauses.join(' ')}
    `
  }

  async initialize({ models, events, logger }) {
    this.logger = logger

    logger.info('Initializing Couchbase Accessor')

    const cluster = new Couchbase.Cluster(this.config.host)
    cluster.authenticate(this.config.credentials.login, this.config.credentials.password)
    this.bucket = cluster.openBucket(this.config.bucket)
    this.bucket.manager().createPrimaryIndex(() => {
      logger.info('Couchbase Accessor successfully initialized')
    })
  }


  // References
  async resolveRef({
    source, args, context, info, model, fieldName,
  }) {
    if (!source[fieldName]) {
      return null
    }

    return new Promise((resolve, reject) => {
      this.bucket.get(source[fieldName], (error, result) => {
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
    const harmonyModel = this.schemas[model.name]

    const typeClause = this.buildTypeClause(model)
    const filterClause = this.buildFilterClause(args.filter)
    const skipClause = (args.skip) ? `OFFSET ${args.skip}` : ''
    const limitClause = 'LIMIT 1'
    const orderByClause = 'ORDER BY id'

    const queryString = this.buildQueryString(
      `SELECT ${this.config.bucket}.*, meta().id`,
      [
        typeClause,
        filterClause,
        orderByClause,
        skipClause,
        limitClause,
      ],
    )

    return new Promise<any>(
      (resolve, reject) => this.bucket.query(
        Couchbase.N1qlQuery.fromString(queryString),
        (err, rows : any[]) => {
          if (err) {
            return reject(err)
          }

          return resolve(rows.map((row) => ({ ...row, _id: row.id }))[0])
        },
      ),
    )
  }

  async readMany({
    source, args, context, info, model,
  }) {
    const harmonyModel = this.schemas[model.name]

    const typeClause = this.buildTypeClause(model)
    const filterClause = this.buildFilterClause(args.filter)
    const skipClause = (args.skip) ? `OFFSET ${args.skip}` : ''
    const limitClause = (args.limit) ? `LIMIT ${args.limit}` : ''
    const orderByClause = (skipClause || limitClause) ? 'ORDER BY id' : ''
      + ''
    const queryString = this.buildQueryString(
      `SELECT ${this.config.bucket}.*, meta().id`,
      [
        typeClause,
        filterClause,
        orderByClause,
        skipClause,
        limitClause,
      ],
    )

    return new Promise<any[]>(
      (resolve, reject) => this.bucket.query(
        Couchbase.N1qlQuery.fromString(queryString),
        (err, rows : any[]) => {
          if (err) {
            return reject(err)
          }

          return resolve(rows.map((row) => ({ ...row, _id: row.id })))
        },
      ),
    )
  }

  async count({
    source, args, context, info, model,
  }) {
    const typeClause = this.buildTypeClause(model)
    const filterClause = `${this.buildFilterClause(args.filter)

    }`
    const queryString = this.buildQueryString(
      'SELECT COUNT(meta().id)',
      [
        typeClause,
        filterClause,
      ],
    )

    return new Promise<number>(
      (resolve, reject) => this.bucket.query(
        Couchbase.N1qlQuery.fromString(queryString),
        (err, rows : any[]) => {
          if (err) {
            return reject(err)
          }

          return resolve(rows[0].$1)
        },
      ),
    )
  }


  // Mutations
  async create({
    source, args, context, info, model,
  }) {
    const harmonyModel = this.schemas[model.name]

    const { _id, ...record } = args.record

    if (this.config.identifiers.channels) {
      record.channels = record.channels || []
      record.channels.push(model.name)
    }

    if (this.config.identifiers.field) {
      record[this.config.identifiers.field] = model.name
    }

    const key = _id || uuid()

    return new Promise((resolve, reject) => {
      this.bucket.get(key, (error, result) => {
        if (result && result.value) {
          reject(new Error(`Document already exists with id ${key}`))
        }

        return this.bucket.upsert(key, record, (err) => {
          if (err) {
            return reject(err)
          }

          return this.bucket.get(key, (e, res) => {
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
    const harmonyModel = this.schemas[model.name]

    const update = toMongoDottedObject(args.record)
    delete update._id

    const mutation = Object.entries(update)
      .reduce((mut, field) => mut.upsert(field[0], field[1], true), this.bucket.mutateIn(args.record._id))

    return new Promise((resolve, reject) => {
      mutation.execute((err, frag) => {
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

        return this.bucket.get(args.record._id, (error, result) => {
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
    const harmonyModel = this.schemas[model.name]

    return new Promise((resolve, reject) => {
      this.bucket.get(args._id, (error, result) => {
        if (error) {
          return reject(error)
        }

        return this.bucket.remove(args._id, (err, res) => {
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
