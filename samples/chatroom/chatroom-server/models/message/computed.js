import { Types } from '@harmonyjs/persistence'
import Cluster from 'cluster'

export default {
  fields: {
    worker: {
      type: Types.String,
      resolve: async ({ source }) => {
        if (Cluster.isMaster) {
          return '(master)'
        }

        return `(slave: ${Cluster.worker.id})`
      },
    },
  },

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
