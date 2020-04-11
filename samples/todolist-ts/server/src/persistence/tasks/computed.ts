import { Computed, Types } from '@harmonyjs/persistence'

import schemas from '../schemas'

export default <Computed<any, any, typeof schemas.Task>> {
  fields: {
    done: {
      type: Types.Boolean,
      resolve: async ({ source }) => (!!source.done),
    },
  },
}
