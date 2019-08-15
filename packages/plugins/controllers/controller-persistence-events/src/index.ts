import { Controller } from '@harmonyjs/types-server'

/*
 * The Persistence Events Controller transfers Persistence Events to SocketIO layer
 */
export default class ControllerPersistenceEvents extends Controller {
  name = 'ControllerPersistenceEvents'

  constructor(config) { // eslint-disable-line
    super(config)
  }

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
