// @flow

import { composeWithMongoose } from 'graphql-compose-mongoose/node8'
import type { MakeComposerArguments, Model } from '@foundationjs/flowtypes/persistence'

export function capitalize(name : string) : string {
  if (!name) {
    return ''
  }

  return name[0].toUpperCase() + name.slice(1)
}

export function getComposerName(model : Model, modelName? : string) : string {
  const { composer } = model
  const name = modelName || model.name

  if (composer) {
    return capitalize(composer)
  }

  const singular = ((name[name.length - 1] === 's') ? (
    name.slice(0, -1)
  ) : (
    name
  )).replace(/-([a-z])/g, (s, v) => v.toUpperCase())

  return capitalize(singular)
}

const makeComposers = ({
  schemaComposer,
  models: Models,
  scopeAccessResolver,
  exclude,
  refMap,
} : MakeComposerArguments) => {
  const composers = {}

  Object.keys(Models)
    .map((name) => {
      const model = Models[name]
      const composerName = getComposerName(model, name)

      const composer = composeWithMongoose(model, {
        name: composerName,
      })
      composer.removeField('password')

      composers[composerName] = composer
      composers[composerName].model = model

      return { model, composer }
    })
    .forEach(({
      model, composer,
    }) => {
      const fields = Object.keys(model.schema.tree).map(key => ([key, model.schema.tree[key]]))

      const refFields = []

      const findNestedRefFields = (fieldsToTest: Array<any>, path: Array<string>) => {
        // Find all nested ref
        fieldsToTest.filter((field) => {
          // Test the field, or the first element of the field if it's an array
          const toCheck = Array.isArray(field[1]) ? field[1][0] : field[1]

          if (field[0] === 'id') { // If the field name is "id" then it's a Mongoose internal field
            return false
          }

          return !(
            // If it's a function, then it's a standard Mongoose type
            toCheck instanceof Function
            // If a "schemaName" is present, then it's a standard field
            || !!toCheck.schemaName
            // If "type" is a function and "ref" is not a string, then it's a Mongoose complex field
            || (typeof toCheck.ref !== 'string' && toCheck.type instanceof Function)
          )
        }).forEach((field) => {
          const array = Array.isArray(field[1])
          const toCheck = array ? field[1][0] : field[1]

          if (typeof toCheck.ref === 'string') {
            // If the ref argument is a string, then we have a ref field
            refFields.push({
              field: field[0],
              ref: toCheck.ref,
              path,
              array,
            })
          } else {
            // Else, we have a nested object or array of nested object, so check all fields again
            findNestedRefFields(Object.entries(toCheck), [...path, field[0]])
          }
        })
      }

      findNestedRefFields(fields, [])

      // Add all ref resolvers
      refFields.forEach((field) => {
        let refComposer = composer

        // Get the correct composer for deeply nested fields
        if (field.path.length) {
          field.path.forEach((path) => {
            refComposer = refComposer.getFieldTC(path)
          })
        }

        // Get the related composer by the ref
        const relatedComposerName = getComposerName(refMap[field.ref])

        // Add the relation
        refComposer.addRelation(
          field.field,
          {
            resolver: () => composers[relatedComposerName].getResolver(field.array ? 'findByIds' : 'findById'),
            prepareArgs: {
              [field.array ? '_ids' : '_id']: source => source[field.field],
            },
          },
        )
      })
    })

  const resolvers : {
    ['Query'|'Mutation']: {
      [string]: Array<string>
    }
  } = {
    Query: {
      get: ['findOne', ''],
      list: ['findMany', 'List'],
      count: ['count', 'Count'],
    },
    Mutation: {
      create: ['createOne', 'Create'],
      createMany: ['createMany', 'CreateMany'],
      update: ['updateById', 'Update'],
      delete: ['removeById', 'Delete'],
    },
  }

  Object.keys(composers)
    .filter(name => !exclude || exclude.indexOf(name) < 0)
    .map(name => ([name, composers[name]]))
    .forEach(([name, composer]) => {
      const lowercase = name[0].toLowerCase() + name.slice(1)

      const createResolver = type => (resolver) => {
        const [method, suffix] = resolvers[type][resolver]
        composer[resolver] = scopeAccessResolver(composers)(composer.getResolver(method), name, resolver) // eslint-disable-line
        composer[resolver].unscoped = composer.getResolver(method) // eslint-disable-line
        composer[resolver].args = composer.getResolver(method).getArgs() // eslint-disable-line
        composer[resolver].type = composer.getResolver(method) // eslint-disable-line
        schemaComposer[type].addFields({
          [lowercase + suffix]: composer[resolver],
        })
      }

      Object.keys(resolvers).forEach((type) => {
        Object.keys(resolvers[type]).forEach(createResolver(type))
      })
    })

  return composers
}

export default makeComposers
