import { SchemaTypes as Types } from 'mongoose'

export default {
  name: Types.String,
  done: Types.Boolean,
  list: {
    type: Types.ObjectId,
    ref: 'lists',
  },
  updateDate: Types.Date,
}
