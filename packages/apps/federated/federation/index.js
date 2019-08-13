import Server from '@harmonyjs/server'

import ControllerApolloFederation from '@harmonyjs/controller-apollo-federation'

const server = new Server()

server.init({
  endpoint: {
    host: 'localhost',
    port: '4000',
  },
  controllers: [
    ControllerApolloFederation({
      path: '/',
      enablePlayground: true,
      services: [
        { name: 'user', url: 'http://localhost:4001' },
        { name: 'preference', url: 'http://localhost:4002' },
      ],
    }),
  ],
})
