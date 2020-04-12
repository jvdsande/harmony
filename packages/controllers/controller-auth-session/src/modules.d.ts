declare module 'memorystore' {
  import { Store } from 'fastify-session'
  class MemoryStore extends Store {
    constructor(args: { checkPeriod: number })
  }

  export = MemoryStore
}
