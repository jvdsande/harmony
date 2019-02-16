export default ({ typeComposers: { List: ListTC } }) => ({
  fields: {
    numberOfTasks: {
      type: 'Int',
      resolve: async ({ source, composers: { Task } }) => Task.count({ list: source._id }),
    },

    numberOfDone: {
      type: 'Int',
      resolve: async ({ source, composers: { Task } }) => Task.count({ list: source._id, done: true }),
    },
  },

  mutations: {
    listCreate: {
      extends: ListTC.create,
      resolve: async ({ args, composers: { List } }) => {
        const { record } = args
        record.creationDate = new Date()

        return List.create(record)
      },
    },

    listDelete: {
      extends: ListTC.delete,
      resolve: async ({ args, composers: { List, Task } }) => {
        // Get all tasks
        const tasks = await Task.list({ list: args._id })

        // Delete all tasks
        tasks.forEach(task => Task.delete(task._id))

        // Delete the List
        return List.delete(args._id)
      },
    },
  },
})
