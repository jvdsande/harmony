import { Types } from '@harmonyjs/persistence'

export default {
  username: {
    type: Types.String,
    unique: true,
  },
  displayName: Types.String,
  color: Types.String,
}
