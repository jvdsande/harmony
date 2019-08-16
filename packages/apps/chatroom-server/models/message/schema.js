import { Types } from '@harmonyjs/persistence'

import user from '../user'

export default {
  author: Types.Reference.of(user),
  room: Types.ID,
  content: Types.String,
  timestamp: Types.Date,
  dates: {
    posted: Types.Date,
    edited: Types.Date,
  },
}
