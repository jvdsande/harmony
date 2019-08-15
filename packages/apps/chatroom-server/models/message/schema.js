import { Types } from '@harmonyjs/persistence'

import User from '../user'

export default {
  author: Types.Reference.of(User.name),
  room: Types.ID,
  content: Types.String,
  timestamp: Types.Date,
}
