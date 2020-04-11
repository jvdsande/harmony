import { Controller } from '@harmonyjs/types-server'

/*
 * The Persistence Events Controller transfers Persistence Events to SocketIO layer
 */
const ControllerPersistenceEvents : Controller<{ events: any }> = function ControllerPersistenceEvents(config) {
  return ({
    name: 'ControllerPersistenceEvents',
    async initialize({ logger, socket }) {
      const { events } = config

      events.on('updated', ({ model, document }) => {
        socket.to('persistence-events').emit(`${model.name}-updated`, document._id)
        socket.to('persistence-events').emit(`${model.name}-saved`, document._id)
      })

      events.on('removed', ({ model, document }) => {
        socket.to('persistence-events').emit(`${model.name}-updated`, document._id)
        socket.to('persistence-events').emit(`${model.name}-removed`, document._id)
      })

      socket.on('connection', (s) => {
        s.join('persistence-events')
      })

      logger.info('Persistence events are forwarded to Socket.IO')
    },
  })
}


export default ControllerPersistenceEvents
