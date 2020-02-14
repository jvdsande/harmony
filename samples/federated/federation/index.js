import Server from '@harmonyjs/server'

import ControllerApolloGateway from '@harmonyjs/controller-apollo-gateway'

const server = new Server()

server.init({
  endpoint: {
    host: 'localhost',
    port: '4000',
  },
  controllers: [
    new ControllerApolloGateway({
      path: '/',
      enablePlayground: true,
      services: [
        { name: 'user', url: 'http://localhost:4001' },
        { name: 'preference', url: 'http://localhost:4002' },
      ],
    }),
  ],
})
