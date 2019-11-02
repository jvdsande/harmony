import {
  Property, PropertySchema, FieldMode, FieldModeEnum, Fields, Field, SanitizedModel, Model,
} from '@harmonyjs/types-persistence'

import Types from '../entities/schema-types'
import { mutationResolvers, queryResolvers } from './resolvers'
import { extractModelType } from './types'

/* eslint-disable no-param-reassign */
function extendField(field: Field, modelName: string) {
  switch (field.extends) {
    case 'get':
    case 'read': {
      field.type = new Property({ type: 'raw', of: modelName })
      field.args = {
        filter: new Property({ type: 'raw', of: `${modelName}InputFilter` }),
        skip: Types.Number,
        sort: Types.Number,
      }
      break
    }
    case 'list':
    case 'readMany': {
      field.type = Types.Array.of(new Property({ type: 'raw', of: modelName }))
      field.args = {
        filter: new Property({ type: 'raw', of: `${modelName}InputFilter` }),
        skip: Types.Number,
        limit: Types.Number,
        sort: Types.Number,
      }
      break
    }
    case 'count': {
      field.type = Types.Number
      field.args = {
        filter: new Property({ type: 'raw', of: `${modelName}InputFilter` }),
      }
      break
    }
    case 'create': {
      field.type = new Property({ type: 'raw', of: modelName })
      field.args = {
        record: new Property({ type: 'raw', of: `${modelName}Input!` }),
      }
      break
    }
    case 'createMany': {
      field.type = Types.Array.of(new Property({ type: 'raw', of: modelName }))
      field.args = {
        records: Types.Array.of(new Property({ type: 'raw', of: `${modelName}Input!` })),
      }
      break
    }
    case 'update': {
      field.type = new Property({ type: 'raw', of: modelName })
      field.args = {
        record: new Property({ type: 'raw', of: `${modelName}InputWithID!` }),
      }
      break
    }
    case 'updateMany': {
      field.type = Types.Array.of(new Property({ type: 'raw', of: modelName }))
      field.args = {
        records: Types.Array.of(new Property({ type: 'raw', of: `${modelName}InputWithID!` })),
      }
      break
    }
    case 'delete': {
      field.type = new Property({ type: 'raw', of: modelName })
      field.args = {
        _id: Types.ID.required,
      }
      break
    }
    case 'deleteMany': {
      field.type = Types.Array.of(new Property({ type: 'raw', of: modelName }))
      field.args = {
        _ids: Types.Array.of(Types.ID.required),
      }
      break
    }
    default:
      break
  }
}
/* eslint-enable no-param-reassign */


function sanitizeField({
  field, name,
} : {
  field: Property | PropertySchema | Property[] | PropertySchema[],
  name: string,
}) {
  const sanitized = new Property({ type: 'raw', name })

  if (field instanceof Property) {
    // If the field was a correct property, copy its configuration

    sanitized._federation = field._federation
    sanitized._configuration = field._configuration
    sanitized.name = name

    sanitized.type = field.type
    sanitized.of = field.of

    if (field.of instanceof Property || field.of instanceof Object) {
      if (sanitized.type !== 'nested') {
        sanitized.of = sanitizeField({
          field: field.of,
          name: '',
        })
        sanitized.of.parent = sanitized
      } else {
        sanitized.of = sanitizeNested({ // eslint-disable-line
          field: field.of,
          mode: null,
          parent: sanitized,
        })
      }
    }

    // If args were provided, sanitize them
    if (field.args && field.args instanceof Object) {
      const argParent = new Property({ type: 'raw', name: 'args ' })
      argParent.parent = sanitized

      sanitized.args = sanitizeNested({  // eslint-disable-line
        field: field.args,
        mode: null,
        parent: argParent,
      })
    }
  } else if (field instanceof Array) {
    // If the field is an array, make it an array property

    sanitized.type = 'array'
    sanitized.of = sanitizeField({
      field: field[0], name: '',
    })
    sanitized.of.parent = sanitized
  } else if (field instanceof Object) {
    // If the field was an object, make it a nested property

    sanitized.type = 'nested'
    sanitized.of = sanitizeNested({ field: field, parent: sanitized, mode: null }) // eslint-disable-line
  }

  return sanitized
}

function sanitizeNested({ field, parent, mode }) {
  const sanitized = {}

  Object.keys(field).forEach((key) => {
    sanitized[key] = sanitizeField({
      field: field[key],
      name: key,
    })
    sanitized[key].parent = parent
    sanitized[key].mode = mode
  })

  return sanitized
}

function sanitizeSchema({ schema, name }) {
  const sanitized = new Property({ type: 'nested', of: {} })

  const mode = [FieldMode.INPUT, FieldMode.OUTPUT]

  sanitized.name = name
  sanitized.mode = mode

  sanitized.of = sanitizeNested({
    field: schema,
    parent: sanitized,
    mode: null,
  })

  return sanitized
}

function sanitizeFields(
  { fields, parent, force } : { fields: Fields, parent: Property, force?: FieldModeEnum },
) : Fields {
  const sanitized = {}


  Object.keys(fields || {})
    .forEach((key) => {
      const mode = force || fields[key].mode || [FieldMode.INPUT, FieldMode.OUTPUT]
      const resolve = fields[key].resolve || null

      const argsParent = new Property({ type: 'raw', name: 'Args' })

      sanitized[key] = {
        mode,
        resolve,
        args: fields[key].args
          ? sanitizeNested({ field: fields[key].args, parent: argsParent, mode: FieldMode.INPUT })
          : null,
        type: sanitizeField({
          field: fields[key].type,
          name: key,
        }),
      }

      argsParent.parent = sanitized[key].type
      sanitized[key].type.mode = mode
      sanitized[key].type.parent = parent
      sanitized[key].type.args = sanitized[key].args
    })

  return sanitized
}

function sanitizeModelComputed({ computed, parent, external }) {
  const sanitized = computed || {
    fields: {},
    queries: {},
    mutations: {},
    custom: {},
  }

  if (!external) {
    sanitized.queries = sanitized.queries || {}
    sanitized.mutations = sanitized.mutations || {}

    const { name } = parent._configuration
    const queryName = extractModelType(name, false)

    queryResolvers.forEach((query) => {
      sanitized.queries[queryName + query.suffix] = sanitized.queries[queryName + query.suffix] || {
        extends: query.type,
        resolve: null,
      }
    })
    mutationResolvers.forEach((query) => {
      sanitized.mutations[queryName + query.suffix] = sanitized.mutations[queryName + query.suffix] || {
        extends: query.type,
        resolve: null,
      }
    })
  }

  if (sanitized.queries) {
    Object.values(sanitized.queries)
      .forEach((query : Field) => {
        extendField(query, parent.graphqlType)
      })
  }

  if (sanitized.mutations) {
    Object.values(sanitized.mutations)
      .forEach((query : Field) => {
        extendField(query, parent.graphqlType)
      })
  }

  return {
    fields: sanitizeFields({ fields: sanitized.fields, parent }),
    queries: sanitizeFields({ fields: sanitized.queries, parent: null, force: FieldMode.OUTPUT }),
    mutations: sanitizeFields({ fields: sanitized.mutations, parent: null, force: FieldMode.OUTPUT }),
    custom: sanitized.custom,
  }
}

// eslint-disable-next-line
export function sanitizeModel(model : Model) {
  const schema = sanitizeSchema({ schema: model.schema, name: model.name })
  const originalSchema = sanitizeSchema({ schema: model.schema, name: model.name })
  const computed = sanitizeModelComputed({ computed: model.computed, parent: schema, external: model.external })

  const sanitized : SanitizedModel = {
    name: model.name,
    schema,
    originalSchema,
    computed,

    accessor: model.accessor,
    scopes: { ...model.scopes },

    external: !!model.external,
  }

  // Inject transient fields in schema
  Object.keys(sanitized.computed.fields)
    .forEach((key) => {
      sanitized.schema.of[key] = sanitized.computed.fields[key].type
    })

  return sanitized
}
