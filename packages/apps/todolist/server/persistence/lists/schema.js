import { Types } from '@harmonyjs/persistence'

export default {
  name: Types.String,
  creationDate: Types.Date,
  description: Types.String,
  tasks: [Types.Reference.of('task')],
  nested: {
    test: Types.String,
    deeply: {
      test: Types.String,
    },
  },
  nestedArray: [{
    test: Types.String,
  }],
}
