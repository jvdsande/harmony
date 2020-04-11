import { Types as MongooseTypes } from 'mongoose'
import { Types as HarmonyTypes, Schema, SchemaOutputType } from '@harmonyjs/persistence'

export const Types = {
  get MongoID() {
    return HarmonyTypes.ID.as<MongooseTypes.ObjectId, MongooseTypes.ObjectId>()
  },
  get MongoReference() {
    return {
      of<T extends Schema = Schema>(name: string) {
        return HarmonyTypes.Reference.of(name).as<
          SchemaOutputType<T> | MongooseTypes.ObjectId, MongooseTypes.ObjectId
        >()
      },
    }
  },
  get MongoReversedReference() {
    function make<T extends Schema = Schema>(foreignField: string, name: string) {
      return HarmonyTypes.ReversedReference.of(name).on(foreignField).as<
        SchemaOutputType<T> | MongooseTypes.ObjectId, MongooseTypes.ObjectId
        >()
    }

    return {
      of<T extends Schema = Schema>(name: string) {
        return ({
          on(foreignField: string) {
            return make<T>(foreignField, name)
          },
        })
      },
      on(foreignField: string) {
        return {
          of<T extends Schema = Schema>(name: string) {
            return make<T>(foreignField, name)
          },
        }
      },
    }
  },
}
