export default () => ({
  fields: {
    done: {
      needs: { done: true },
      type: 'Boolean',
      resolve: async ({ source }) => (!!source.done),
    },
  },
})
