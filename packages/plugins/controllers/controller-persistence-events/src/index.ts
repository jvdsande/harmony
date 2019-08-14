import { Controller } from '@harmonyjs/server'

/*
 * The Persistence Events Controller transfers Persistence Events to SocketIO layer
 */
export default class ControllerPersistenceEvents extends Controller {
  name = 'ControllerPersistenceEvents'

  async initialize({ server, logger }) {
    const { events } = this.config

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
}
