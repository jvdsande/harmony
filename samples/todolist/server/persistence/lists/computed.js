import { Types } from '@harmonyjs/persistence'

export default ({
  fields: {
    numberOfTasks: {
      type: Types.Number,
      resolve: async ({ source, resolvers: { Task } }) => Task.count({ filter: { list: source._id } }),
    },

    numberOfDone: {
      type: Types.Number,
      args: {
        isDone: Types.Boolean,
        nestedArgs: {
          someInt: Types.Number,
          someString: Types.String,
          someNested: {
            nestedBoolean: Types.Boolean,
          },
        },
      },
      resolve: async ({ source, resolvers: { Task } }) => Task.count({ filter: { list: source._id, done: true } }),
    },

    tasks: {
      type: [Types.Reference.of('task')],
      resolve: async ({ source, resolvers: { Task } }) => Task.list({ filter: { list: source._id } }),
    },
  },

  mutations: {
    listCreate: {
      extends: 'create',
      resolve: async ({ args, resolvers: { List } }) => {
        const { record } = args
        record.creationDate = new Date()

        return List.create({ record })
      },
    },

    listDelete: {
      extends: 'delete',
      resolve: async ({ args, resolvers: { List, Task } }) => {
        // Get all tasks
        const tasks = await Task.list({ filter: { list: args._id } })

        // Delete all tasks
        tasks.forEach((task) => Task.delete({ _id: task._id }))

        // Delete the List
        return List.delete({ _id: args._id })
      },
    },
  },
})
