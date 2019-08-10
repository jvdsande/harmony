const {
  Types, FieldMode, Persistence, Accessor,
} = require('@harmonyjs/persistence')

const { default: MemoryAccessor } = require('@harmonyjs/accessor-memory')
const { default: MongooseAccessor } = require('@harmonyjs/accessor-mongoose')

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
  },
}

const persistence = new Persistence([Author, Book], [new MongooseAccessor({
  host: 'mongodb://localhost:27017/',
  database: 'test',
})])

const { graphqlTypes, resolvers } = persistence

const { ApolloServer, gql } = require('apollo-server')

// The GraphQL schema
const typeDefs = gql(graphqlTypes)

const server = new ApolloServer({
  typeDefs,
  mocks: false,
  mockEntireSchema: false,
  resolvers,
  dataSources: () => ({
    test: new Accessor(),
  }),
})

server.listen().then(({ url }) => {
  console.log(`🚀 Server ready at ${url}`)
})
