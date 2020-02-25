import { SanitizedModel } from '@harmonyjs/types-persistence'

import AdapterCouchbaseConfiguration from 'configuration'

import { toMongoFilterDottedObject } from 'utils/query'

type HarmonyOperator = 'not'|'eq'|'neq'|'exists'|'in'|'nin'|'gte'|'gt'|'lte'|'lt'|'regex'|'match'|'some'|'all'

type N1QLOperator = (string | string[] | { [key: string]: string })[] | null

const N1QLOperators : Record<HarmonyOperator, N1QLOperator> = {
  not: ['_key', 'NOT', '_value'],
  eq: ['_key', '=', '_value'],
  neq: ['_key', '!=', '_value'],
  exists: ['_key', { true: 'IS NOT MISSING', false: 'IS MISSING' }],
  in: ['_key', 'IN', '_value'],
  nin: ['NOT', ['_key', 'IN', '_value']],
  gte: ['_key', '>=', '_value'],
  lte: ['_key', '<=', '_value'],
  gt: ['_key', '>', '_value'],
  lt: ['_key', '<', '_value'],
  regex: ['REGEXP_CONTAINS(', '_key', ',', '_value', ')'],
  match: null,
  some: null,
  all: null,
}

function sanitizeOperators(operators : Record<string, any>) {
  const sanitized : Record<string, any> = {}

  Object.entries(operators)
    .forEach(([operator, params] : [string, Record<string, any>|any]) => {
      if (sanitized[operator]) {
        sanitized[operator] = params
      }

      if (operator === 'some') {
        sanitized[operator] = sanitizeOperators(params)
      }
      if (operator === 'all') {
        sanitized[operator] = sanitizeOperators(params)
      }

      if (operator === 'match') {
        delete sanitized[operator]

        Object.entries(params)
          .forEach(([k, p]) => {
            sanitized[k] = sanitizeOperators(p as Record<string, any>)
          })
      }
    })

  return sanitized
}

export function sanitizeFilter(filter? : Record<string, any>) {
  if (!filter) {
    return filter
  }

  const newFilter = { ...filter }

  delete newFilter._operators
  delete newFilter._or
  delete newFilter._and
  delete newFilter._nor

  if (filter._operators) {
    const ops : Record<string, any> = {}

    Object.entries(filter._operators)
      .forEach(([field, operators] : [string, any]) => {
        ops[field] = sanitizeOperators(operators)
      })

    newFilter.$operators = ops
  }

  if (filter._or) {
    newFilter.$or = filter._or.map(sanitizeFilter)
  }

  if (filter._and) {
    newFilter.$and = filter._and.map(sanitizeFilter)
  }

  if (filter._nor) {
    newFilter.$nor = filter._nor.map(sanitizeFilter)
  }

  return ({ ...newFilter })
}

export type N1QLBuilders = {
  buildTypeClause: (model: SanitizedModel) => string,
  buildOperatorFieldClause: (n1qlOperation: N1QLOperator, key: string, value: string, operator: string) => string,
  buildOperatorClause: (key: string, operators: Record<HarmonyOperator, string>) => string,
  buildSanitizedFilterClause: (sanitizedFilter: Record<string, any>, join?: string) => string,
  buildFilterClause: (filter?: Record<string, any>) => string,
  buildQueryString: (type: string, clauses: string[]) => string,
}

export function createN1QLBuilders({ config } : { config: AdapterCouchbaseConfiguration }) : N1QLBuilders {
  const builders : N1QLBuilders = ({
    buildTypeClause(model) {
      const typeFieldClause = (config.identifiers.field
        ? `${config.identifiers.field} = "${model.name}"`
        : null
      )
      const typeChannelsClause = (config.identifiers.channels
        ? `ANY channel IN channels SATISFIES channel = "${model.name}" END`
        : null
      )

      if (typeFieldClause || typeChannelsClause) {
        return `(${[typeFieldClause, typeChannelsClause].filter((c) => !!c).join(' OR ')})`
      }

      return ''
    },

    buildOperatorFieldClause(n1qlOperation, key, value, operator) {
      if (!n1qlOperation) {
        throw new Error(`Unsupported operator on a Couchbase adapter: ${operator}`)
      }

      const printValue = (v: any) : string => {
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
            return builders.buildOperatorFieldClause(field, key, value, operator)
          }
          if (typeof field === 'object') {
            return field[`${value}`]
          }

          return field
        })
        .join(' ')
    },

    buildOperatorClause(key, operators) {
      return Object.keys(operators)
        .map((operator : any) => {
          const value = operators[operator as HarmonyOperator]
          const n1qlOperation = N1QLOperators[operator as HarmonyOperator]
          return builders.buildOperatorFieldClause(n1qlOperation, key, value, operator)
        })
        .join(' AND ')
    },

    buildSanitizedFilterClause(sanitizedFilter, join = 'AND') {
      if (sanitizedFilter._id) {
        // eslint-disable-next-line no-param-reassign
        sanitizedFilter['meta().id'] = sanitizedFilter._id
        // eslint-disable-next-line no-param-reassign
        delete sanitizedFilter._id
      }

      const printValue = (value : any) : string => {
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
              throw new Error('Unsupported type on a Couchbase adapter filter: object')
            }

            return `${key} = ${printValue(value)}`
          })
          .join(' AND ')
        }`

        // If there was an "operators" clause, add it as a separate AND clause
        if (sanitizedFilter.$operators) {
          const operatorsQuery = Object.keys(sanitizedFilter.$operators)
            .map((key) => builders.buildOperatorClause(key, sanitizedFilter.$operators[key]))
            .join(' AND ')

          const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

          mainQuery += `${addAnd}(${operatorsQuery})`
        }

        // If there was an "and" clause, add all clauses to the chain
        if (sanitizedFilter.$and) {
          const andQuery = sanitizedFilter.$and
            .map((clause : Record<string, any>) => builders.buildSanitizedFilterClause(clause))
            .join(' ')
            .slice(3)

          const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

          mainQuery += `${addAnd}(${andQuery})`
        }

        // If there was an "or" clause, add all clauses to the chain as a unique AND clause
        if (sanitizedFilter.$or) {
          const orQuery = sanitizedFilter.$or
            .map((clause : Record<string, any>) => builders.buildSanitizedFilterClause(clause, 'OR'))
            .join(' ')
            .slice(3)

          const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

          mainQuery += `${addAnd}(${orQuery})`
        }

        // If there was an "nor" clause, add all clauses to the chain as a unique AND clause
        if (sanitizedFilter.$nor) {
          const orQuery = sanitizedFilter.$nor
            .map((clause : Record<string, any>) => builders.buildSanitizedFilterClause(clause, 'OR'))
            .join(' ')
            .slice(3)

          const addAnd = mainQuery.trim() !== '' ? ' AND' : ''

          mainQuery += `${addAnd} NOT (${orQuery})`
        }

        return `${join} (${mainQuery})`
      }

      return ''
    },

    buildFilterClause(filter) {
      if (!filter) {
        return ''
      }

      const sanitized = sanitizeFilter(filter) || {}

      const {
        $or, $and, $nor, $operators,
      } = sanitized

      const sanitizedFilter = toMongoFilterDottedObject(sanitized)

      sanitizedFilter.$or = $or
      sanitizedFilter.$and = $and
      sanitizedFilter.$nor = $nor
      sanitizedFilter.$operators = $operators

      return builders.buildSanitizedFilterClause(sanitizedFilter)
    },

    buildQueryString(type, clauses) {
      return `
          ${type} FROM \`${config.bucket}\` WHERE ${clauses.join(' ')}
    `
    },
  })

  return builders
}
