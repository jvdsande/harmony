import { Types } from '@harmonyjs/persistence'
import user from '../user'

export default {
  user: Types.Reference.of(user.name),
  room: Types.ID,
  timestamp: Types.Number.indexed,
}
