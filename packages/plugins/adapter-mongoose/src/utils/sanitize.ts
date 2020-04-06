import { IProperty, IPropertyReference, IPropertySchema } from '@harmonyjs/types-persistence'
import { Query } from 'mongoose'
import { toMongoFilterDottedObject } from 'utils/query'

import { GraphQLResolveInfo, FieldNode, SelectionNode } from 'graphql'

type Filter = Record<string, any>

const operatorMap : Record<string, string> = {
  not: '$not',
  nor: '$nor',
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
  some: '$elemMatch',
}

function sanitizeOperators(operators : Record<string, any>) {
  const sanitized : Record<string, any> = {}

  Object.entries(operators)
    .forEach(([operator, params] : [string, Record<string, any>|any]) => {
      // If the operator already exists, use it directly
      if (operatorMap[operator]) {
        sanitized[operatorMap[operator]] = params
      }

      // In the case of a date, transform to ISO String
      if (params instanceof Date) {
        sanitized[operatorMap[operator]] = params.toISOString()
      }

      // Array Operator: some. In this case, the params are operators and need to be sanitized
      if (operator === 'some') {
        sanitized[operatorMap[operator]] = sanitizeOperators(params)
      }
      // Array Operator: all. In this case, the params are operators again, and we need to invert twice the some case
      if (operator === 'all') {
        delete sanitized[operatorMap[operator]]

        sanitized[operatorMap.not] = {
          [operatorMap.some]: {
            [operatorMap.nor]: [sanitizeOperators(params)],
          },
        }
      }

      // Object Operator: match. In this case, each param is a set of operators, and needs to be sanitized
      if (operator === 'match') {
        delete sanitized[operatorMap[operator]]

        Object.entries(params as Record<string, any>)
          .forEach(([k, p]) => {
            sanitized[k] = sanitizeOperators(p)
          })
      }
    })

  return sanitized
}

export function sanitizeFilter(filter? : Filter) {
  if (!filter) {
    return filter
  }

  const newFilter = { ...filter }

  delete newFilter._operators
  delete newFilter._or
  delete newFilter._and
  delete newFilter._nor

  const $and = [...(filter._and || [])]
  const $or = [...(filter._or || [])]
  const $nor = [...(filter._nor || [])]

  if (filter._operators) {
    const ops : Record<string, any> = {}

    Object.entries(filter._operators as Record<string, any>)
      .forEach(([field, operators]) => {
        ops[field] = sanitizeOperators(operators)
      })

    $and.push(ops)
  }

  if ($or.length) {
    newFilter.$or = $or.map(sanitizeFilter)
  }

  if ($and.length) {
    newFilter.$and = $and.map(sanitizeFilter)
  }

  if ($nor.length) {
    newFilter.$nor = $nor.map(sanitizeFilter)
  }

  return toMongoFilterDottedObject({ ...newFilter })
}

function extractPopulatePaths({ model, info } : { model: IPropertySchema, info: GraphQLResolveInfo }) {
  // Construct the field selection mapping
  const fields : {[key: string]: IProperty} = {}

  const extractSelections = (selections : readonly SelectionNode[], path : string, schema : IPropertySchema) => {
    selections.forEach((selection) => {
      if (selection.kind === 'Field') {
        const current = [path, selection.name.value].filter((p) => !!p).join('.')

        const { of } = schema

        if (of[selection.name.value]) {
          fields[current] = of[selection.name.value]

          if (selection.selectionSet && fields[current] && fields[current].type === 'schema') {
            extractSelections(selection.selectionSet.selections, current, fields[current] as IPropertySchema)
          }
        }
      }
    })
  }

  const extractBaseSelections = (selections : readonly FieldNode[]) => (
    selections && selections
      .filter((selection) => !!selection.selectionSet)
      .forEach((selection) => {
        extractSelections(selection.selectionSet!.selections, '', model)
      })
  )

  extractBaseSelections(info.fieldNodes)
  delete fields._id

  return Object.entries(fields)
    .filter(([, def]) => def.type === 'reference')
    .map(([path, def]) => ({ path, of: (def as IPropertyReference).of }))
}

export function buildPopulatedQuery({
  harmonyModel,
  harmonyExternals,
  external,
  info,
  query,
} : {
  harmonyModel: IPropertySchema,
  harmonyExternals: Record<string, boolean>,
  external: boolean,
  info?: GraphQLResolveInfo,
  query: Query<any>
}) {
  if (external) {
    return query.lean ? query.lean() : query
  }

  return query.lean ? query.lean() : query

  /*
  const populatePaths = extractPopulatePaths({ model: harmonyModel, info })
    .filter((field) => !harmonyExternals[field.of])

  return populatePaths
    .reduce((q, field) => q.populate({
      path: field.path,
      options: { lean: true },
    }), query.lean ? query.lean() : query)
   */
}
