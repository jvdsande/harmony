import { IEvents } from '@harmonyjs/types-persistence'

export default function Events() : IEvents & { close(): Promise<void> } {
  const subscriptions : {[key: string]: Function[]} = {
    updated: [],
    removed: [],
  }

  const instance : IEvents = ({
    on(event, callback) {
      subscriptions[event] = subscriptions[event] || []

      if (!subscriptions[event].includes(callback)) {
        subscriptions[event].push(callback)
      }
    },
    off(event, callback) {
      subscriptions[event] = subscriptions[event] || []

      if (subscriptions[event].includes(callback)) {
        subscriptions[event].splice(subscriptions[event].indexOf(callback), 1)
      }
    },
    emit({ event, payload }) {
      (subscriptions[event] || []).forEach((callback) => callback(payload))
    },
    updated({ document, model }) {
      instance.emit({ event: 'updated', payload: { document, model } })
    },
    removed({ document, model }) {
      instance.emit({ event: 'removed', payload: { document, model } })
    },
  })

  return {
    ...instance,
    async close() {
      Object.keys(subscriptions).forEach((event) => {
        subscriptions[event].length = 0
      })
    },
  }
}
