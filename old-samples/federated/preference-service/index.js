import Persistence, { Types } from '@harmonyjs/persistence'
import Server from '@harmonyjs/server'

import AdapterMongoose from '@harmonyjs/adapter-mongoose'

const PreferenceModel = {
  name: 'preference',
  schema: {
    theme: Types.String,
    user: Types.Reference.of('user'),
  },
}

const UserModel = {
  name: 'user',
  schema: {},
  computed: {
    fields: {
      preference: {
        type: Types.Reference.of('preference'),
        async resolve({ source, resolvers }) {
          console.log("resolving user.preference")
          return resolvers.Preference.read({ user: source._id })
        },
      },
    },
  },
  external: true,
}

const persistence = new Persistence()
const server = new Server()

async function run() {
  await persistence.initialize({
    models: [PreferenceModel, UserModel],
    adapters: {
      mongo: new AdapterMongoose({
        host: 'mongodb://localhost:27017/',
        database: 'federated-preference',
      }),
    },
  })

  await server.initialize({
    endpoint: {
      host: 'localhost',
      port: '4002',
    },
    controllers: [
      persistence.controllers.ControllerGraphQL({
        path: '/',
        enablePlayground: true,
      }),
    ],
  })
}

run()

