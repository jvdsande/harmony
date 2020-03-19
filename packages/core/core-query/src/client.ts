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
      } else if (content.alias && typeof content.alias !== 'object') {
        query[name] = content
      } else {
        const aliased = content.alias || name
        query[aliased] = {}

        if (content.alias) {
          query[aliased].__aliasFor = name
        }

        if (content.args) {
          query[aliased].__args = content.args
          Object.keys(query[aliased].__args)
            .forEach((key) => {
              if (query[aliased].__args[key] === undefined) {
                delete query[aliased].__args[key]
              }
            })

          if (Object.keys(query[aliased].__args).length < 1) {
            delete query[aliased].__args
          }
        }

        if (content.select) {
          Object.keys(content.select)
            .forEach((key) => {
              query[aliased][key] = transformJSQ(content.select![key] as QueryDefinition, true)
              Object.keys(query[aliased][key])
                .forEach((k) => {
                  if (query[aliased][key][k] === undefined) {
                    delete query[aliased][key][k]
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
    configure(config?: ClientConfiguration) {
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
      return Builder(instance)
    },

    get fork() {
      return ClientMaker()
    },
  })

  return instance
}

const Client = ClientMaker()

export default Client
