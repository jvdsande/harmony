export default ({ typeComposers: { UserTC } }) => ({
  fields: {
    displayName: {
      type: 'String',
      needs: { username: true, displayName: true },
      resolve: async ({ source }) => source.displayName || source.username,
    },
  },

  queries: {
    login: {
      type: 'String',
      args: {
        username: 'String',
      },
      resolve: async ({ args, composers: { User }, context: { authentication } }) => {
        let user = await User.get({ username: args.username })

        if (!user) {
          const created = await User.create({ username: args.username })

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
      extends: UserTC.update,
      resolve: async ({ args, composers: { User }, context: { authentication } }) => {
        // Retrieve the ID from the authentication object
        const userId = authentication.get()._id

        // Call the User update method with updated arguments
        return User.update({
          ...args.record,
          _id: userId,
        })
      },
    },
  },
})
