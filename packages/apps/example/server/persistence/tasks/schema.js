import { Types } from '@harmonyjs/persistence'

export default {
  name: Types.String,
  done: Types.Boolean,
  list: Types.Reference.of('list'),
  updateDate: Types.Date,
}
