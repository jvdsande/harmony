import { Types } from '@harmonyjs/persistence'

export default {
  name: Types.String,
  creationDate: Types.Date,
  description: Types.String,
  nested: {
    field1: Types.String,
    deeply: {
      field1: Types.String,
    },
  }
}
