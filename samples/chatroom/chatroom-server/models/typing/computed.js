import { Types } from '@harmonyjs/persistence'

export default {
  queries: {
    withNestedType: {
      type: {
        someString: Types.String,
        someNumber: Types.Number,
      },
      resolve: () => null,
    },
    withNestedArg: {
      type: Types.String,
      args: {
        nestedArg: {
          someString: Types.String,
          someNumber: Types.Number,
        },
      },
    },
    typingList: {
      extends: 'list',
      resolve: async ({ args, resolvers: { Typing }, context: { authentication } }) => {
        const typings = await Typing.list({ filter: args.filter })

        return typings
          ? typings.filter((t) => !authentication.get() || String(t.user) !== String(authentication.get()._id))
          : typings
      },
    },
  },
  mutations: {
    typingCreate: {
      extends: 'create',
      resolve: async ({ args, resolvers: { Typing }, context: { authentication } }) => {
        // Get the current user
        const user = authentication.get()._id

        // Get the required typing object
        const typing = await Typing.get({ filter: { ...args.record, user } })

        // Get the current timestamp as a number
        const timestamp = new Date().valueOf()

        // Call the Typing create or update method with updated arguments
        if (typing) {
          return Typing.update({
            record: {
              _id: typing._id,
              timestamp,
              user,
            },
          })
        }

        return Typing.create({
          record: {
            ...args.record,
            timestamp,
            user,
          },
        })
      },
    },
  },
}
