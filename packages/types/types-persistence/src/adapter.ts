import { ILogger } from '@harmonyjs/logger'

import { SanitizedModel } from 'model'
import { IEvents } from './events'
import { Scalar } from './configuration'


type InitArgs = { models: SanitizedModel[], events: IEvents, logger: ILogger }
type Entity = {[key: string]: any} | null


type CountResolverArgs = {
  filter?: {[key: string]: any}
}
type ReadResolverArgs = CountResolverArgs & {
  skip?: number
  sort?: any
}
type ReadManyResolverArgs = ReadResolverArgs & {
  limit?: number
}

type RecordArg = {[key: string]: any}
type RecordArgWithId<T> = RecordArg & { _id: T }

type CreateResolverArgs = {
  record: RecordArg
}

type CreateManyResolverArgs = {
  records: RecordArg[]
}

type UpdateResolverArgs<T> = {
  record: RecordArgWithId<T>
}

type UpdateManyResolverArgs<T> = {
  records: RecordArgWithId<T>[]
}

type DeleteResolverArgs<T> = {
  _id: T
}

type DeleteManyResolverArgs<T> = {
  _ids: T[]
}

export interface IAdapter<T = string> {
  name: string
  scalar?: Scalar

  initialize(args : InitArgs) : Promise<void>
  close() : Promise<void>

  // Batch
  resolveBatch(args : { model: SanitizedModel, fieldName: string, keys: string[] }) : Promise<Entity[]>

  // Queries
  read(args : { model: SanitizedModel, args: ReadResolverArgs }) : Promise<Entity>
  readMany(args : { model: SanitizedModel, args: ReadManyResolverArgs }) : Promise<Entity[]>
  count(args : { model: SanitizedModel, args: CountResolverArgs }) : Promise<number>

  // Mutations
  create(args : { model: SanitizedModel, args: CreateResolverArgs }) : Promise<Entity>
  createMany(args : { model: SanitizedModel, args: CreateManyResolverArgs }) : Promise<Entity[]>
  update(args : { model: SanitizedModel, args: UpdateResolverArgs<T> }) : Promise<Entity>
  updateMany(args : { model: SanitizedModel, args: UpdateManyResolverArgs<T> }) : Promise<Entity[]>
  delete(args : { model: SanitizedModel, args: DeleteResolverArgs<T> }) : Promise<Entity>
  deleteMany(args : { model: SanitizedModel, args: DeleteManyResolverArgs<T> }) : Promise<Entity[]>
}

export type Adapter<T = void, U = {}> = ((args: T) => IAdapter<any> & U)
