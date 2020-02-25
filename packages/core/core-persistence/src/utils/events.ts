import { IEvents } from '@harmonyjs/types-persistence'

export default function Events() : IEvents {
  const instance : IEvents = ({
    subscriptions: {
      updated: [],
      removed: [],
    },

    on(event, callback) {
      instance.subscriptions[event].push(callback)
    },
    updated({ document, model }) {
      instance.subscriptions.updated.forEach((subscription) => subscription({ document, model }))
    },
    removed({ document, model }) {
      instance.subscriptions.removed.forEach((subscription) => subscription({ document, model }))
    },
  })

  return instance
}
