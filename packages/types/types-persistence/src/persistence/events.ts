export default class Events {
  subscriptions = {
    updated: [],
    removed: [],
  }

  on(event, callback) {
    this.subscriptions[event].push(callback)
  }

  updated({ document, model }) {
    this.subscriptions.updated.forEach((subscription) => subscription({ document, model }))
  }

  removed({ document, model }) {
    this.subscriptions.removed.forEach((subscription) => subscription({ document, model }))
  }
}
