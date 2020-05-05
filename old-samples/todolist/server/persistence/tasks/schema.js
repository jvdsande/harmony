import { Types } from '@harmonyjs/persistence'
import List from '../lists'

export default {
  name: Types.String,
  done: Types.Boolean,
  list: Types.Reference.of(List),
  updateDate: Types.Date,
}
