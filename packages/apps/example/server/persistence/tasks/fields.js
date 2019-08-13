import { Types, FieldMode } from '@harmonyjs/persistence'

export default {
  fields: {
    done: {
      needs: { done: true },
      type: Types.Boolean,
      mode: [FieldMode.INPUT, FieldMode.OUTPUT],
      resolve: async ({ source }) => (!!source.done),
    },
  },
}
