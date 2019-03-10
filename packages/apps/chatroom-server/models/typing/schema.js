import { Types } from '@harmonyjs/persistence'
import Users from '../users'

export default {
  user: {
    type: Types.ObjectId,
    ref: Users.name,
  },
  room: Types.ObjectId,
  timestamp: {
    type: Types.Number,
    index: true,
  },
}
