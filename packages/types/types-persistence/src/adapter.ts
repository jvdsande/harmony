import { ILogger } from '@harmonyjs/logger'

import {
  ResolverContext, ResolverInfo, ResolverSource, SanitizedModel,
} from 'model'
import { IEvents } from './events'


type InitArgs = { models: SanitizedModel[], events: IEvents, logger: ILogger }
type ResolverArgs = {
  source?: ResolverSource,
  context?: ResolverContext,
  info: ResolverInfo,
  model: SanitizedModel,
}
type Entity = Record<string, any> | null

type QueryResolverArgs = ResolverArgs & {
  args: {
    filter?: Record<string, any>
    limit?: number,
    skip?: number,
    sort?: any,
  }
}

type CreateResolverArgs = ResolverArgs & {
  args: {
    record: Record<string, any>
  }
}

type CreateManyResolverArgs = ResolverArgs & {
  args: {
    records: Record<string, any>[] | Record<string, any>
  }
}

type UpdateResolverArgs = ResolverArgs & {
  args: {
    record: Record<string, any> & { _id: string }
  }
}

type UpdateManyResolverArgs = ResolverArgs & {
  args: {
    records: (Record<string, any> & { _id: string })[] | (Record<string, any> & { _id: string })
  }
}

type DeleteResolverArgs = ResolverArgs & {
  args: {
    _id: string,
  }
}

type DeleteManyResolverArgs = ResolverArgs & {
  args: {
    _ids: string | string[],
  }
}

export interface IAdapter {
  name: string,
  initialize(args : InitArgs) : Promise<void>,

  // References
  resolveRef(args : ResolverArgs & { fieldName: string, foreignFieldName: string }) : Promise<Entity>,
  resolveRefs(args : ResolverArgs & { fieldName: string, foreignFieldName: string }) : Promise<Entity[]>,

  // Queries
  read(args : QueryResolverArgs) : Promise<Entity>,
  readMany(args : QueryResolverArgs) : Promise<Entity[]>,
  count(args : QueryResolverArgs) : Promise<number>,

  // Mutations
  create(args : CreateResolverArgs) : Promise<Entity>,
  createMany(args : CreateManyResolverArgs) : Promise<Entity[]>,
  update(args : UpdateResolverArgs) : Promise<Entity>,
  updateMany(args : UpdateManyResolverArgs) : Promise<Entity[]>,
  delete(args : DeleteResolverArgs) : Promise<Entity>,
  deleteMany(args : DeleteManyResolverArgs) : Promise<Entity[]>,
}

export type Adapter<T = void> = ((args: T) => IAdapter)
