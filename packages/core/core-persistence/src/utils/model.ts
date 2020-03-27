import {
  Fields, ExtendableFields, Resolvers, Scopes,
  IProperty, PropertyMode,
  Model, SanitizedModel, Schema, ExtendableField,
} from '@harmonyjs/types-persistence'
import { createOperatorType } from 'utils/property/operators'
import { queryResolvers, ResolverDefinition, mutationResolvers } from 'utils/resolvers'

import Types from 'utils/types'

import PropertyFactory from 'utils/property/factory'
import { extractModelType, wrap } from 'utils/property/utils'
import { sanitizeSchemaField, sanitizeSchema } from 'utils/property/sanitation'

function extendField(field: ExtendableField, modelName: string): { type?: IProperty, args?: Schema } {
  switch (field.extends) {
    case 'read': {
      return {
        type: PropertyFactory({ type: 'raw', of: modelName, name: modelName }),
        args: {
          filter: PropertyFactory({ type: 'raw', of: `${modelName}FilterInput`, name: `${modelName}Filter` }),
          skip: Types.Number,
          sort: Types.Number,
        },
      }
    }
    case 'readMany': {
      return {
        type: Types.Array.of(PropertyFactory({ type: 'raw', of: modelName, name: '' })),
        args: {
          filter: PropertyFactory({ type: 'raw', of: `${modelName}FilterInput`, name: `${modelName}Filter` }),
          skip: Types.Number,
          limit: Types.Number,
          sort: Types.Number,
        },
      }
    }
    case 'count': {
      return {
        type: Types.Number,
        args: {
          filter: PropertyFactory({ type: 'raw', of: `${modelName}FilterInput`, name: `${modelName}Filter` }),
        },
      }
    }
    case 'create': {
      return {
        type: PropertyFactory({ type: 'raw', of: modelName, name: '' }),
        args: {
          record: PropertyFactory({ type: 'raw', of: `${modelName}CreateInput`, name: `${modelName}Create` }).required,
        },
      }
    }
    case 'createMany': {
      return {
        type: Types.Array.of(PropertyFactory({ type: 'raw', of: modelName, name: '' })),
        args: {
          records: Types.Array.of(
            PropertyFactory({ type: 'raw', of: `${modelName}CreateInput`, name: `${modelName}Create` }).required,
          ).required,
        },
      }
    }
    case 'update': {
      return {
        type: PropertyFactory({ type: 'raw', of: modelName, name: '' }),
        args: {
          record: PropertyFactory({ type: 'raw', of: `${modelName}UpdateInput`, name: `${modelName}Update` }).required,
        },
      }
    }
    case 'updateMany': {
      return {
        type: Types.Array.of(PropertyFactory({ type: 'raw', of: modelName, name: '' })),
        args: {
          records: Types.Array.of(
            PropertyFactory({ type: 'raw', of: `${modelName}UpdateInput`, name: `${modelName}Update` }).required,
          ).required,
        },
      }
    }
    case 'delete': {
      return {
        type: PropertyFactory({ type: 'raw', of: modelName, name: '' }),
        args: {
          _id: Types.ID.required,
        },
      }
    }
    case 'deleteMany': {
      return {
        type: Types.Array.of(PropertyFactory({ type: 'raw', of: modelName, name: '' })),
        args: {
          _ids: Types.Array.of(Types.ID.required).required,
        },
      }
    }
    default:
      break
  }

  return {}
}

function extractMainSchema({ schema, name }: { schema: Schema, name: string }) {
  const sanitized = sanitizeSchema({ schema, name })

  Object.keys(sanitized.of)
    .forEach((key) => {
      if (sanitized.of[key].mode.length < 1) {
        sanitized.of[key].mode.push(PropertyMode.OUTPUT)
        sanitized.of[key].mode.push(PropertyMode.INPUT)
      }
    })

  return sanitized
}

function extractComputedSchema({ fields, name }: { fields?: Fields, name: string }) {
  const schema: Schema = {}

  if (!fields) {
    return PropertyFactory({ type: 'schema', name, of: {} })
  }

  Object.keys(fields)
    .forEach((key) => {
      schema[key] = fields[key].type
    })

  const sanitized = sanitizeSchema({ schema, name })

  Object.keys(sanitized.of)
    .forEach((key) => {
      if (fields[key] && fields[key].args) {
        sanitized.of[key].withArgs(sanitizeSchema({ schema: fields[key].args!, name: 'args' }))
      }

      if (fields[key] && fields[key].mode) {
        sanitized.of[key].mode = wrap(fields[key].mode)
      }

      if (sanitized.of[key].mode.length < 1) {
        sanitized.of[key].mode.push(PropertyMode.OUTPUT)
      }
    })

  return sanitized
}

function extractRootSchema({
  fields, name, baseName, base, external, strict, scopes,
} : {
  fields: ExtendableFields,
  name: string,
  baseName: string,
  base: ResolverDefinition[],
  external: boolean,
  strict: boolean,
  scopes: Scopes
}) {
  const schema : Schema = {}

  // Fill schema with default queries
  base.forEach((res) => {
    if (!external && (!strict || scopes[res.type])) {
      const { type, args } = extendField(
        { extends: res.type, resolve: null as any },
        extractModelType(name),
      )

      schema[extractModelType(name, false) + res.suffix] = sanitizeSchemaField({
        schema: type!,
        name: '',
      })
        .withArgs(args!)
    }
  })

  // Fill schema with provided queries
  Object.keys(fields).forEach((queryName) => {
    const field : ExtendableField = fields[queryName]

    const { type, args } = field.extends ? extendField(field, extractModelType(name)) : field

    const property = sanitizeSchemaField({
      schema: type || field.type || {},
      name: queryName,
    })

    if (args || field.args) {
      property.withArgs(args || field.args || {})
    }

    property.mode = wrap(field.mode)

    schema[queryName] = property
  })

  return extractMainSchema({ schema, name: baseName })
}

function extractResolvers({ fields }: { fields: ExtendableFields|Fields }): Resolvers {
  const resolvers: Resolvers = {}


  Object.keys(fields).forEach((field) => {
    if (fields[field].resolve) {
      const resolve = fields[field].resolve!
      const { scopes, transforms } = fields[field]

      if (!scopes && !transforms) {
        resolvers[field] = resolve
      } else {
        resolvers[field] = async (params) => {
          let { args } = params

          // Chain all scopes function to get the final args
          if (scopes) {
            // eslint-disable-next-line no-restricted-syntax
            for (const scope of scopes) {
              // eslint-disable-next-line no-await-in-loop
              args = (await scope({ ...params, args })) || args
            }
          }

          // Run main resolver function
          let value = await resolve({ ...params, args })

          if (transforms) {
            // eslint-disable-next-line no-restricted-syntax
            for (const transform of transforms) {
              // eslint-disable-next-line no-await-in-loop
              value = (await transform({ ...params, args, value })) || value
            }
          }

          return value
        }
      }
    }
  })

  return resolvers
}

// eslint-disable-next-line import/prefer-default-export
export function sanitizeModel({ model, strict }: { model: Model, strict: boolean }): SanitizedModel {
  const {
    name, adapter, schema, computed, external, scopes, transforms, ...otherProps
  } = model

  return ({
    ...otherProps,
    name,
    adapter,
    schemas: {
      main: extractMainSchema({
        schema, name,
      }),
      computed: extractComputedSchema({
        fields: computed && computed.fields, name,
      }),
      queries: extractRootSchema({
        fields: (computed && computed.queries) || {},
        name,
        baseName: 'Query',
        base: queryResolvers,
        external: !!external,
        strict,
        scopes: scopes || {} as any,
      }),
      mutations: extractRootSchema({
        fields: (computed && computed.mutations) || {},
        name,
        baseName: 'Mutation',
        base: mutationResolvers,
        external: !!external,
        strict,
        scopes: scopes || {} as any,
      }),
    },
    resolvers: {
      queries: extractResolvers({ fields: (computed && computed.queries) || {} }),
      mutations: extractResolvers({ fields: (computed && computed.mutations) || {} }),
      computed: extractResolvers({ fields: (computed && computed.fields) || {} }),
      custom: (computed && computed.custom) || {},
    },
    scopes: scopes || {},
    transforms: transforms || {},
    external: !!external,
  })
}

export function printSchema({ model }: { model: SanitizedModel }) {
  const outputSchema: Schema = {}
  const inputFilterSchema: Schema = {}
  const inputCreateSchema: Schema = {}
  const inputUpdateSchema: Schema = {}

  // Divide schema keys between input fields and output fields
  const extract = (schema: { [key: string]: IProperty }) => {
    Object.keys(schema)
      .forEach((key) => {
        const { mode } = schema[key]
        if (mode.includes(PropertyMode.OUTPUT) || mode.length < 1) {
          outputSchema[key] = schema[key]
        }
        if (mode.includes(PropertyMode.INPUT) || mode.length < 1) {
          inputFilterSchema[key] = schema[key]
          inputCreateSchema[key] = schema[key]
          inputUpdateSchema[key] = schema[key]
        }
      })
  }

  // Add _id to filter and create schemas
  inputFilterSchema._id = Types.ID
  inputCreateSchema._id = Types.ID

  // Add _id.required to update schema and output schema
  outputSchema._id = model.external ? Types.ID.required.external : Types.ID.required
  inputUpdateSchema._id = Types.ID.required

  // Populate using main schema
  extract(model.schemas.main.of)
  // Populate using compute schema, computed overrides main
  extract(model.schemas.computed.of)

  // Create _operators before adding _and/_or/_nor
  const ops = createOperatorType({ schema: sanitizeSchema({ schema: inputFilterSchema, name: '' }) })

  // Add _and, _or, _nor to inputFilterSchema
  inputFilterSchema._and = Types.Array.of(
    PropertyFactory({ type: 'raw', of: `${extractModelType(model.name)}FilterInput`, name: '' }),
  )
  inputFilterSchema._or = Types.Array.of(
    PropertyFactory({ type: 'raw', of: `${extractModelType(model.name)}FilterInput`, name: '' }),
  )
  inputFilterSchema._nor = Types.Array.of(
    PropertyFactory({ type: 'raw', of: `${extractModelType(model.name)}FilterInput`, name: '' }),
  )

  // Add _operators to inputFilterSchema
  inputFilterSchema._operators = ops

  const inputs = model.external ? '' : `
# Filter Schema
${sanitizeSchema({ schema: inputFilterSchema, name: `${model.name}Filter` }).graphqlInputSchema}  

# Create Schema
${sanitizeSchema({ schema: inputCreateSchema, name: `${model.name}Create` }).graphqlInputSchema}  

# Update Schema
${sanitizeSchema({ schema: inputUpdateSchema, name: `${model.name}Update` }).graphqlInputSchema}`

  return `
${inputs}

# Output Schema
${
  sanitizeSchema({ schema: outputSchema, name: model.name }).graphqlSchema.replace(
    `type ${extractModelType(model.name)} {`,
    model.external
      ? `extend type ${extractModelType(model.name)} @key(fields: "_id") {`
      : `type ${extractModelType(model.name)} @key(fields: "_id") {`,
  )
}

# Queries & Mutations
${
  model.schemas.queries.graphqlSchema.replace(
    'type Query {',
    'extend type Query {',
  )
}
${
  model.schemas.mutations.graphqlSchema.replace(
    'type Mutation {',
    'extend type Mutation {',
  )
}
`.replace(/\n\n/g, '\n')
}
