import { Computed, field, query, Types } from '@harmonyjs/persistence'

import schemas from '../schemas'

export default <Computed<typeof schemas.List, any, typeof schemas>> ({
  fields: {
    numberOfTasks: field({
      type: Types.Number,
      resolve: async ({ source, resolvers }) => {
        return resolvers.Task.count({ filter: { list: source._id } })
      },
    }),

    numberOfDone: field({
      type: Types.Number,
      resolve: async ({ source, resolvers }) => resolvers.Task.count({ filter: { list: source._id, done: true } }),
    }),

    tasks: field({
      type: [Types.ReversedReference.of('task').on('list')],
    }),
  },

  mutations: {
    listCreate: query({
      extends: 'create',
      resolve: async ({ args, resolvers }) => {
        const { record } = args

        record.creationDate = new Date()

        return resolvers.List.create({ record })
      },
    }),

    listDelete: query({
      extends: 'delete',
      resolve: async ({ args, resolvers: { List, Task } }) => {
        // Get all tasks
        const tasks = await Task.list({ filter: { list: args._id } })

        // Delete all tasks
        if(tasks) {
          tasks.forEach((task) => Task.delete({ _id: task._id }))
        }

        // Delete the List
        return List.delete({ _id: args._id })
      },
    }),
  },
})
