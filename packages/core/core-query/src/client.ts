import {
  ClientConfiguration, IClient, QueryDefinition,
} from '@harmonyjs/types-query'

import ApolloBoost, {
  ApolloClient, FetchPolicy,
} from 'apollo-boost'
import Builder from 'builder'
import SocketIO from 'socket.io-client'

import Graphql from 'graphql-tag'
import { jsonToGraphQLQuery as JSQ } from 'json-to-graphql-query'

const transformJSQ = (q: QueryDefinition, noWrap: boolean = false) => {
  const query : any = {}

  Object.entries(q)
    .forEach(([name, content]) => {
      if (
        typeof content === 'boolean'
        || Object.keys(content).filter((k) => !['args', 'select', 'alias'].includes(k)).length
        || Object.keys(content).includes('__args')
      ) {
        query[name] = content
      } else if (content.args && typeof content.args !== 'object') {
        query[name] = content
      } else if (content.select && typeof content.select !== 'object') {
        query[name] = content
      } else if (content.alias && typeof content.alias !== 'string') {
        query[name] = content
      } else {
        query[name] = {}

        if (content.alias) {
          query[name].__aliasFor = content.alias
        }

        if (content.args) {
          query[name].__args = content.args
          Object.keys(query[name].__args)
            .forEach((key) => {
              if (query[name].__args[key] === undefined) {
                delete query[name].__args[key]
              }
            })

          if (Object.keys(query[name].__args).length < 1) {
            delete query[name].__args
          }
        }

        if (content.select) {
          Object.keys(content.select)
            .forEach((key) => {
              query[name][key] = transformJSQ(content.select![key] as QueryDefinition, true)
              Object.keys(query[name][key])
                .forEach((k) => {
                  if (query[name][key][k] === undefined) {
                    delete query[name][key][k]
                  }
                })
            })
        }
      }
    })

  if (noWrap) {
    return query
  }

  return JSQ(query)
}

const constructUri = ({
  host,
  port,
  path,
  defaultPath,
  usePath = true,
} : {
  host?: string
  port?: string|number
  path?: string
  defaultPath: string
  usePath?: boolean
}) => {
  const uriHostRaw = host || ''
  const uriHost = uriHostRaw.endsWith('/') ? uriHostRaw.slice(0, -1) : uriHostRaw

  const uriPort = String(port || '')

  const uriPathRaw = path || defaultPath
  const uriPath = uriPathRaw.startsWith('/') ? uriPathRaw : `/${uriPathRaw}`

  const uriBase = [uriHost, uriPort].filter((s) => !!s).join(':')

  if (usePath) {
    return { uri: uriBase + uriPath, path: uriPath }
  }

  return { uri: uriBase, path: uriPath }
}

function ClientMaker() : IClient {
  const local : { client: ApolloClient<any>, fetchPolicy: FetchPolicy, socket: SocketIOClient.Socket } = ({} as any)
  const clientsLifecycle : {
    current: number
    ongoingQueries: Record<number, number>
    scheduledForStop: Record<number, ApolloClient<any>>
    purge(client: number): void
    run(query: Promise<any>): Promise<any>
  } = {
    current: 0,
    ongoingQueries: {},
    scheduledForStop: {},
    purge(client) {
      if (clientsLifecycle.scheduledForStop[client] && !clientsLifecycle.ongoingQueries[client]) {
        clientsLifecycle.scheduledForStop[client].stop()
        delete clientsLifecycle.scheduledForStop[client]
      }
    },
    run(query) {
      const { current } = clientsLifecycle
      clientsLifecycle.ongoingQueries[current] += 1

      return query
        .then(({ data }) => {
          clientsLifecycle.ongoingQueries[current] -= 1
          clientsLifecycle.purge(current)

          return data
        })
    },
  }
  const socketSubscriptions : {[key: string]: Function[]} = {}

  const instance : IClient = ({
    configure(config?: ClientConfiguration) {
      const {
        graphql, socket,
      } = config || {}

      instance.close()

      const { uri: clientUri } = constructUri({
        ...(graphql || {}),
        defaultPath: '/graphql',
      })
      const { uri: socketUri, path: socketPath } = constructUri({
        ...(socket || {}),
        defaultPath: '/harmonyjs-socket',
        usePath: false,
      })

      local.fetchPolicy = (graphql && graphql.fetchPolicy) || 'network-only'
      local.socket = SocketIO(socketUri, { path: socketPath })

      // Restore subscriptions
      Object.keys(socketSubscriptions)
        .forEach((event) => {
          socketSubscriptions[event].forEach((callback) => {
            local.socket.on(event, callback)
          })
        })

      local.client = new ApolloBoost({
        uri: clientUri,
        headers: (graphql && graphql.headers) || {},
      })

      return instance
    },
    async close() {
      if (local.socket) {
        local.socket.close()
      }
      if (local.client) {
        if (clientsLifecycle.ongoingQueries[clientsLifecycle.current]) {
          clientsLifecycle.scheduledForStop[clientsLifecycle.current] = local.client
        } else {
          local.client.stop()
        }
        clientsLifecycle.current += 1
      }
      clientsLifecycle.ongoingQueries[clientsLifecycle.current] = 0
      delete clientsLifecycle.scheduledForStop[clientsLifecycle.current]
    },

    query(query) {
      if (!local.client) {
        throw new Error('You must initialize the client before accessing the server. Use Client::configure')
      }
      return clientsLifecycle.run(local.client.query({
        query: Graphql((`{ ${transformJSQ(query)} }`)),
        fetchPolicy: local.fetchPolicy,
      }))
    },
    mutation(mutation) {
      if (!local.client) {
        throw new Error('You must initialize the client before accessing the server. Use Client::configure')
      }
      return clientsLifecycle.run(local.client.mutate({
        mutation: Graphql((`mutation { ${transformJSQ(mutation)} }`)),
      }))
    },

    subscribe(event, callback) {
      if (local.socket) {
        local.socket.on(event, callback)
      }

      socketSubscriptions[event] = socketSubscriptions[event] || []
      if (!socketSubscriptions[event].includes(callback)) {
        socketSubscriptions[event].push(callback)
      }

      return instance
    },
    unsubscribe(event, callback) {
      if (local.socket) {
        local.socket.off(event, callback)
      }

      socketSubscriptions[event] = socketSubscriptions[event] || []
      if (socketSubscriptions[event].includes(callback)) {
        socketSubscriptions[event].splice(socketSubscriptions[event].indexOf(callback), 1)
      }

      return instance
    },

    get builder() {
      return Builder<any>(instance)
    },

    get fork() {
      return ClientMaker()
    },
  })

  return instance
}

const Client = ClientMaker()

export default Client
