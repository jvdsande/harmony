import {
  IClient,
  IQueryBuilder, QueryArgs, QueryDefinition, QuerySelect,
} from '@harmonyjs/types-query'

export default function Builder(Client: IClient) : IQueryBuilder {
  const local : {
    name?: string,
    alias?: string,
    args?: QueryArgs,
    selection?: QuerySelect,
  } = {}

  const instance : IQueryBuilder = {
    withName(name) {
      local.name = name
      return instance
    },
    withAlias(alias) {
      local.alias = alias
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
          alias: local.alias,
          args: local.args,
          select: local.selection,
        }) : true,
      })
    },

    asQuery() {
      return Client.query(instance.build()).then((data: any) => data[local.alias || local.name!])
    },
    asMutation() {
      return Client.mutation(instance.build()).then((data: any) => data[local.alias || local.name!])
    },

    combineQueries(queries) {
      const queryDefinitions : QueryDefinition[] = queries.map((q) => q.build())
      const queryDefinition : QueryDefinition = queryDefinitions.reduce((def, query) => ({ ...def, ...query }), {})

      return Client.query(queryDefinition).then((data: any) => queryDefinitions.map((query) => {
        const alias = Object.keys(query)[0]
        return data[alias]
      }))
    },

    combineMutations(queries) {
      const queryDefinitions : QueryDefinition[] = queries.map((q) => q.build())
      const queryDefinition : QueryDefinition = queryDefinitions.reduce((def, query) => ({ ...def, ...query }), {})

      return Client.mutation(queryDefinition).then((data: any) => queryDefinitions.map((query) => {
        const alias = Object.keys(query)[0]
        return data[alias]
      }))
    },
  }

  return instance
}
