import {
  IProperty, IPropertySchema, IPropertyUndiscriminated, PropertyType,
} from '@harmonyjs/types-persistence'
import PropertyFactory from 'utils/property/factory'
import Types from 'utils/types'

type Operator = {
  name: string
  type: 'inherit' | PropertyType
  array?: boolean
}

const genericOperators : Operator[] = [
  { name: 'eq', type: 'inherit' },
  { name: 'neq', type: 'inherit' },
  { name: 'exists', type: 'boolean' },
  { name: 'in', type: 'inherit', array: true },
  { name: 'nin', type: 'inherit', array: true },
]

const numberOperators : Operator[] = [
  { name: 'gte', type: 'inherit' },
  { name: 'lte', type: 'inherit' },
  { name: 'gt', type: 'inherit' },
  { name: 'lt', type: 'inherit' },
]

const stringOperators : Operator[] = [
  { name: 'regex', type: 'string' },
]

function createOperator({ operator, type, of } : { operator: Operator, type: PropertyType, of?: any }) {
  const ops = PropertyFactory({
    type: operator.type === 'inherit' ? type : operator.type,
    of,
    name: '',
  })

  return operator.array ? Types.Array.of(ops) : ops
}

function createOperatorField({
  property,
} : {
  property: IProperty
}) : IPropertySchema {
  const operators : {[key:string]: IProperty} = {}

  function makeOperator(operator : Operator) {
    operators[operator.name] = createOperator({
      operator,
      type: property.type,
      of: (property as IPropertyUndiscriminated).of,
    });

    (operators[operator.name] as IPropertyUndiscriminated).isFor = (property as IPropertyUndiscriminated).isFor
  }

  if (!['array', 'schema'].includes(property.type)) {
    genericOperators.forEach(makeOperator)
  }

  if (['number', 'float', 'date', 'id', 'reference', 'reversed-reference'].includes(property.type)) {
    numberOperators.forEach(makeOperator)
  }

  if (['string'].includes(property.type)) {
    stringOperators.forEach(makeOperator)
  }

  if (property.type === 'array') {
    return Types.Schema.of({
      exists: Types.Boolean,
      some: createOperatorField({ property: property.of }),
      all: createOperatorField({ property: property.of }),
    })
  }

  if (property.type === 'schema') {
    return Types.Schema.of({
      // eslint-disable-next-line no-use-before-define
      match: createOperatorType({ schema: property as IPropertySchema }),
    })
  }

  return Types.Schema.of(operators)
}

// eslint-disable-next-line import/prefer-default-export
export function createOperatorType({ schema } : { schema: IPropertySchema }) {
  const match : {[key: string]: IProperty} = {}
  Object.keys(schema.of)
    .forEach((key) => {
      match[key] = createOperatorField({ property: schema.of[key] })
    })
  return Types.Schema.of(match)
}
