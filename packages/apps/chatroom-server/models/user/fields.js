import { Types } from '@harmonyjs/persistence'

export default {
  fields: {
    displayName: {
      type: Types.String,
      resolve: async ({ source }) => source.displayName || source.username,
    },
    someOtherField: {
      type: Types.Boolean,
      resolve: () => false,
    },
    someNumber: {
      mode: ['INPUT'],
      type: Types.Number,
      resolve: () => 42,
    },
    someNested: {
      args: {
        test: Types.String,
        nested: {
          test1: Types.String,
          test2: Types.String,
        },
        array: [[[[{
          nestedInArray: Types.Boolean,
        }]]]],
      },
      type: {
        float: Types.Float,
      },
      resolve: () => ({ float: 42.43 }),
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
