import { IQueryBuilder, QueryArgs, QuerySelect } from '@harmonyjs/types-query'

import Client from 'client'

export default function Builder() : IQueryBuilder {
  const local : {
    name?: string,
    args?: QueryArgs,
    selection?: QuerySelect,
  } = {}

  const instance : IQueryBuilder = {
    withName(name) {
      local.name = name
      return instance
    },
    withArgs(args) {
      local.args = args
      return instance
    },
    withSelection(selection) {
      local.selection = selection
      return instance
    },
    build() {
      if (!local.name) {
        throw new Error('Cannot build a query without a name. Use withName(name)')
      }
      return ({
        [local.name]: (local.selection || local.args) ? ({
          args: local.args,
          select: local.selection,
        }) : true,
      })
    },
    asQuery() {
      return Client.query(instance.build()).then((data: any) => data[local.name!])
    },
    asMutation() {
      return Client.mutation(instance.build()).then((data: any) => data[local.name!])
    },
  }

  return instance
}
