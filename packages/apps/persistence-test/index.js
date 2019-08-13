import Server from '@harmonyjs/server'
import Persistence, { Types, FieldMode } from '@harmonyjs/persistence'

import MongooseAccessor from '@harmonyjs/accessor-mongoose'

import ControllerApolloFederation from '@harmonyjs/controller-apollo-federation'

const Author = {
  name: 'author',
  schema: {
    name: Types.String,
    books: Types.Array.of(Types.Reference.of('book')),
  },
}

const Book = {
  name: 'book',
  schema: {
    title: Types.String,
    pages: Types.Number,
    content: Types.String,
    author: Types.Reference.of('author'),
  },
  fields: {
    readingTime: {
      type: Types.Float,
      needs: {
        content: true,
      },
      async resolve({
        source,
      }) {
        return (source && source.content) ? source.content.length / 100 : Math.PI
      },
    },
    complexField: {
      type: {
        value1: Types.String,
        value2: Types.Number,
      },
      async resolve({ source, context }) {
        const promise = new Promise((resolve) => {
          setTimeout(() => resolve(' World'), 100)
        })

        const word = await promise

        return {
          value1: `Hello${word}`,
          value2: 1001,
        }
      },
    },
    inputField: {
      type: Types.String,
      mode: FieldMode.INPUT,
    },
    inputOutputField: {
      type: Types.Float,
      mode: [FieldMode.INPUT, FieldMode.OUTPUT],
    },
    inputComplex: {
      type: {
        test: Types.Boolean,
      },
      mode: [FieldMode.INPUT],
    },

    source: {
      type: Types.JSON,
      async resolve({ source }) { return source },
    },

    context: {
      type: Types.JSON,
      async resolve({ context }) {
        console.log({ context })
        return context
      },
    },

    authentication: {
      type: Types.JSON,
      async resolve({ context }) {
        return {
          next: context.authentication.create({ hello: 'world' }),
          current: context.authentication.get(),
        }
      },
    },
  },
}

const persistence = new Persistence()
persistence.init({
  models: [Author, Book],
  accessors: {
    mongo: new MongooseAccessor({
      host: 'mongodb://localhost:27017/',
      database: 'test',
    }),
  },
})

const server = new Server()

server.init({
  controllers: [
    ControllerApolloFederation({
      path: '/graphql',
      enablePlayground: true,
      services: [
        { name: 'example', url: 'http://localhost:3000/graphql' },
      ],
    }),
  ],
  endpoint: {
    host: 'localhost',
    port: 8080,
  },
})
