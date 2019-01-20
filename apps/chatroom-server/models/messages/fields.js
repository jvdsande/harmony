export default ({ typeComposers: { MessageTC } }) => ({
  mutations: {
    messageCreate: {
      extends: MessageTC.create,
      resolve: async ({ args, composers: { Message }, context: { authentication } }) => {
        // Get the current user
        const userId = authentication.get()._id

        // Get the current timestamp
        const timestamp = new Date().toISOString()

        // Call the Message create method with updated arguments
        return Message.create({
          ...args.record,
          timestamp,
          author: userId,
        })
      },
    },
  },
})
