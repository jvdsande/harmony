import { Types } from '@harmonyjs/persistence'

export default {
  fields: {
    displayName: {
      type: Types.String,
      resolve: async ({ source }) => source.displayName || source.username,
    },
  },

  queries: {
    login: {
      type: Types.String,
      args: {
        username: Types.String,
      },
      resolve: async ({ args, resolvers: { User }, context: { authentication } }) => {
        let user = await User.get({ filter: { username: args.username } })

        if (!user) {
          const created = await User.create({ record: { username: args.username } })

          user = created.record
        }

        return authentication.create(
          { _id: user._id },
        )
      },
    },
  },

  mutations: {
    userUpdate: {
      extends: 'update',
      resolve: async ({ args, resolvers: { User }, context: { authentication } }) => {
        // Retrieve the ID from the authentication object
        const userId = authentication.get()._id

        // Call the User update method with updated arguments
        return User.update({
          record: {
            ...args.record,
            _id: userId,
          },
        })
      },
    },
  },
}
