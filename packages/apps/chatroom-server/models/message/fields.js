export default {
  mutations: {
    messageCreate: {
      extends: 'create',
      resolve: async ({ args, resolvers: { Message }, context: { authentication } }) => {
        // Get the current user
        const userId = authentication.get()._id

        // Get the current timestamp
        const timestamp = new Date().toISOString()

        // Call the Message create method with updated arguments
        return Message.create({
          record: {
            ...args.record,
            timestamp,
            author: userId,
          },
        })
      },
    },
  },
}
