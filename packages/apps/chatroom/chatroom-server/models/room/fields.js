export default {
  queries: {
    room: {
      extends: 'get',
      resolve: async ({ args, resolvers: { Room, User }, context: { authentication } }) => {
        // Get the current user object
        const user = await User.get({ filter: { _id: authentication.get()._id } })

        // Update the list of users accordingly, and sort it so that it's always the same
        // no matter the connected user
        const usernames = [...new Set([...args.filter.usernames, user.username])].sort()

        // Get the required room object
        const room = await Room.get({
          filter: {
            usernames,
          },
        })

        // Create the room if it does not exist
        if (!room) {
          const created = await Room.create({
            record: {
              usernames,
            },
          })

          return created.record
        }

        return room
      },
    },
  },
}
