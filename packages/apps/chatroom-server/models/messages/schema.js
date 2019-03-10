import { Types } from '@harmonyjs/persistence'

export default {
  author: {
    type: Types.ObjectId,
    ref: 'users',
  },
  room: Types.ObjectId,
  content: Types.String,
  timestamp: Types.Date,
}
