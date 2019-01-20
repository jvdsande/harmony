export default ({ typeComposers: { TypingTC } }) => ({
  queries: {
    typingList: {
      extends: TypingTC.list,
      resolve: async ({ args, composers: { Typing }, context: { authentication } }) => {
        const typings = await Typing.list(args.filter)

        return typings ? typings.filter(t => String(t.user) !== String(authentication.get()._id)) : typings
      },
    },
  },
  mutations: {
    typingCreate: {
      extends: TypingTC.create,
      resolve: async ({ args, composers: { Typing }, context: { authentication } }) => {
        // Get the current user
        const user = authentication.get()._id

        // Get the required typing object
        const typing = await Typing.get(args.record)

        // Get the current timestamp as a number
        const timestamp = new Date().valueOf()

        // Call the Typing create or update method with updated arguments
        if (typing) {
          return Typing.update({
            _id: typing._id,
            timestamp,
            user,
          })
        }

        return Typing.create({
          ...args.record,
          timestamp,
          user,
        })
      },
    },
  },
})
