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
        || Object.keys(content).filter((k) => !['args', 'select'].includes(k)).length
        || Object.keys(content).includes('__args')
      ) {
        query[name] = content
      } else if (content.args && typeof content.args !== 'object') {
        query[name] = content
      } else if (content.select && typeof content.select !== 'object') {
        query[name] = content
      } else {
        query[name] = {}

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
        delete clientsLifecycle.scheduledForStop
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
    configure(config: ClientConfiguration) {
      const {
        endpoint, path, token, fetchPolicy,
      } = config || {}

      const headers : { authorization?: string } = {}
      if (token) {
        headers.authorization = `Bearer ${token}`
      }

      const host = (endpoint && endpoint.host) || ''
      const port = (endpoint && endpoint.port)

      const graphql = (path && path.graphql) || '/graphql'
      const socket = (path && path.socket) || '/harmonyjs-socket'

      const graphqlPath = (graphql.startsWith('/') ? '' : '/') + graphql
      const socketPath = (socket.startsWith('/') ? '' : '/') + socket

      const portPath = (port ? `:${port}` : '')
      const hostPath = (host.endsWith('/') ? host.slice(0, -1) : host)

      const clientUri : string = hostPath + portPath + graphqlPath
      const socketUri = hostPath + portPath

      local.fetchPolicy = fetchPolicy || 'network-only'

      if (local.socket) {
        local.socket.close()
      }

      local.socket = SocketIO(socketUri, { path: socketPath })

      // Restore subscriptions
      Object.keys(socketSubscriptions)
        .forEach((event) => {
          socketSubscriptions[event].forEach((callback) => {
            local.socket.on(event, callback)
          })
        })

      if (local.client) {
        if (clientsLifecycle.ongoingQueries[clientsLifecycle.current]) {
          clientsLifecycle.scheduledForStop[clientsLifecycle.current] = local.client
        } else {
          local.client.stop()
        }
        clientsLifecycle.current += 1
        clientsLifecycle.ongoingQueries[clientsLifecycle.current] = 0
        delete clientsLifecycle.scheduledForStop[clientsLifecycle.current]
      }

      local.client = new ApolloBoost({
        uri: clientUri,
        headers,
      })

      return instance
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
      socketSubscriptions[event].push(callback)
      socketSubscriptions[event].filter((c, i, a) => a.indexOf(c) === i)
      return instance
    },
    unsubscribe(event, callback) {
      if (local.socket) {
        local.socket.off(event, callback)
      }
      socketSubscriptions[event] = socketSubscriptions[event] || []
      socketSubscriptions[event].splice(socketSubscriptions[event].indexOf(callback), 1)
      local.socket.off(event, callback)
      return instance
    },

    get builder() {
      return Builder()
    },
  })

  return instance
}

const Client = ClientMaker()

export default Client
