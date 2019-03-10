import H2O2 from 'h2o2'
import { HMRAddress } from '@harmonyjs/typedefs/server'

export default async function (server: any, { host, port, path }: HMRAddress) {
  await server.register(H2O2)

  server.route({
    method: 'GET',
    path: `${path}/{path*}`,
    handler: {
      proxy: {
        host,
        port,
        passThrough: true,
      },
    },
  })
}
