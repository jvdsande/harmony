import { Types as HarmonyTypes } from '@harmonyjs/persistence'

export const Types = {
  get MemoryID() {
    return HarmonyTypes.ID
  },
  get MemoryReference() {
    return HarmonyTypes.Reference
  },
  get MemoryReversedReference() {
    return HarmonyTypes.ReversedReference
  },
}
