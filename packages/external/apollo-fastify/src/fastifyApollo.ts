import {
  convertNodeHttpToRequest,
  GraphQLOptions,
  runHttpQuery,
} from 'apollo-server-core'
import { FastifyReply, FastifyRequest, RequestHandler } from 'fastify'
import { IncomingMessage, OutgoingMessage } from 'http'
import { ValueOrPromise } from 'apollo-server-types'

// eslint-disable-next-line import/prefer-default-export
export async function graphqlFastify(
  options: (
    req?: FastifyRequest<IncomingMessage>,
    res?: FastifyReply<OutgoingMessage>,
  ) => ValueOrPromise<GraphQLOptions>,
): Promise<RequestHandler<IncomingMessage, OutgoingMessage>> {
  if (!options) {
    throw new Error('Apollo Server requires options.')
  }

  return async (
    request: FastifyRequest<IncomingMessage>,
    reply: FastifyReply<OutgoingMessage>,
  ) => {
    try {
      const { graphqlResponse, responseInit } = await runHttpQuery(
        [request, reply],
        {
          method: request.req.method as string,
          options,
          query: request.req.method === 'POST' ? request.body : request.query,
          request: convertNodeHttpToRequest(request.raw),
        },
      )

      if (responseInit.headers) {
        Object.entries<string>(responseInit.headers)
          .forEach(([name, value]) => {
            reply.header(name, value)
          })
      }
      reply.serializer((payload: string) => payload)
      reply.send(graphqlResponse)
    } catch (error) {
      if (error.name !== 'HttpQueryError') {
        throw error
      }

      if (error.headers) {
        Object.keys(error.headers).forEach((header) => {
          reply.header(header, error.headers[header])
        })
      }

      reply.code(error.statusCode)
      reply.serializer((payload: string) => payload)
      reply.send(error.message)
    }
  }
}
