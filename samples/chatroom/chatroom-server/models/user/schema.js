import { Types } from '@harmonyjs/persistence'

export default {
  username: Types.String.unique,
  displayName: Types.String,
  color: Types.String,
}
