import Persistence, { Types } from '@harmonyjs/persistence'
import Server from '@harmonyjs/server'

import AdapterMongoose from '@harmonyjs/adapter-mongoose'

const UserModel = {
  name: 'user',
  schema: {
    firstName: Types.String,
    lastName: Types.String,
  },
}

const persistence = new Persistence()
const server = new Server()

async function run() {
  await persistence.initialize({
    models: [UserModel],
    adapters: {
      mongo: AdapterMongoose({
        host: 'mongodb://localhost:27017/',
        database: 'federated',
      }),
    },
  })

  await server.initialize({
    endpoint: {
      host: 'localhost',
      port: '4001',
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
