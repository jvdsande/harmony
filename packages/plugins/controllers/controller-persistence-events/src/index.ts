// Require ApolloGraphql
import { ApolloServer, gql } from 'apollo-server-hapi'

// Require logger
import Logger from '@harmonyjs/logger'

import { ServerController } from '@harmonyjs/typedefs/server'

const logger : Logger = new Logger('GraphQLController')

/*
 * The Persistence Events Controller transfers Persistence Events to SocketIO layer
 */
const ControllerPersistenceEvents = function (options) : ServerController {
  const { events } = options

  async function initialize({ server, log }) {
    logger.level = log.level

    events.on('updated', ({ model, document }) => {
      server.io.to('persistence-events').emit(`${model.name.toLowerCase()}-updated`, document)
      server.io.to('persistence-events').emit(`${model.name.toLowerCase()}-saved`, document)
    })

    events.on('removed', ({ model, document }) => {
      server.io.to('persistence-events').emit(`${model.name.toLowerCase()}-updated`, document)
      server.io.to('persistence-events').emit(`${model.name.toLowerCase()}-removed`, document)
    })

    server.io.on('connection', (socket) => {
      socket.join('persistence-events')
    })

    logger.info('Persistence events are forwarded to Socket.IO')
  }

  return {
    initialize,
    plugins: [],
  }
}

export default ControllerPersistenceEvents
