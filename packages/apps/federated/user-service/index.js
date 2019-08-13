import Persistence, { Types } from '@harmonyjs/persistence'
import Server from '@harmonyjs/server'

import AccessorMongoose from '@harmonyjs/accessor-mongoose'

const UserModel = {
  name: 'user',
  schema: {
    firstName: Types.String,
    lastName: Types.String,
  },
}

const persistence = new Persistence()

persistence.init({
  models: [UserModel],
  accessors: {
    mongo: new AccessorMongoose({
      host: 'mongodb://localhost:27017/',
      database: 'federated',
    }),
  },
})

const server = new Server()

server.init({
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
