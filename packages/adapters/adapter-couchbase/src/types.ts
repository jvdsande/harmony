import { Types as HarmonyTypes } from '@harmonyjs/persistence'

export const Types = {
  get CouchbaseID() {
    return HarmonyTypes.ID
  },
  get CouchbaseReference() {
    return HarmonyTypes.Reference
  },
  get CouchbaseReversedReference() {
    return HarmonyTypes.ReversedReference
  },
}
