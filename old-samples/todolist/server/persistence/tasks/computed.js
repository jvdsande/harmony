import { Types } from '@harmonyjs/persistence'

export default {
  fields: {
    done: {
      needs: { done: true },
      type: Types.Boolean,
      resolve: async ({ source }) => (!!source.done),
    },
  },
}
