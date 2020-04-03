import { QuerySelect } from 'query'

export interface IAccessorBuilderBase<T> {
  select(selection: QuerySelect): this

  then(callback: (value: T) => Promise<any>): Promise<any>

  catch(callback: (error: Error) => Promise<any>): Promise<any>

  finally(callback: () => void): Promise<any>
}

export interface IAccessorSubscribableBuilderBase<T> extends IAccessorBuilderBase<T> {
  listen(...models: string[]): this

  subscribe(callback: (value: T) => Promise<any>): this

  unsubscribe(callback: (value: T) => Promise<any>): this
}

export interface IAccessorCountBuilder<T> extends IAccessorSubscribableBuilderBase<T> {
  where(filter: Record<string, any>): this
}

export interface IAccessorReadBuilder<T> extends IAccessorCountBuilder<T> {
  // where
  skip(skip: number): this

  sort(sort: number): this
}

export interface IAccessorManyReadBuilder<T> extends IAccessorReadBuilder<T> {
  // where
  // skip
  // sort
  limit(limit: number): this
}

export interface IAccessorCreationBuilder<T> extends IAccessorBuilderBase<T> {
  withRecord(record: Record<string, any>): this
}

export interface IAccessorManyCreationBuilder<T> extends IAccessorBuilderBase<T> {
  withRecords(...records: Record<string, any>[]): this

  withRecords(records: Record<string, any>[]): this
}

export interface IAccessorUpdateBuilder<T> extends IAccessorCreationBuilder<T> {
  // withRecord
  withId(id: string): this
}

export interface IAccessorManyUpdateBuilder<T> extends IAccessorManyCreationBuilder<T> {
  // withRecords
}

export interface IAccessorDeletionBuilder<T> extends IAccessorBuilderBase<T> {
  withId(id: string): this
}

export interface IAccessorManyDeletionBuilder<T> extends IAccessorBuilderBase<T> {
  withIds(...ids: string[]): this

  withIds(ids: string[]): this
}

export type IAccessorQueryBuilder<T> = IAccessorCountBuilder<T> | IAccessorReadBuilder<T> | IAccessorManyReadBuilder<T>
export type IAccessorMutationBuilder<T> = IAccessorCreationBuilder<T> | IAccessorUpdateBuilder<T> |
  IAccessorDeletionBuilder<T> | IAccessorManyCreationBuilder<T> |
  IAccessorManyUpdateBuilder<T> | IAccessorManyDeletionBuilder<T>


export interface IAccessorUndiscriminatedQueryBuilder<T> extends IAccessorBuilderBase<T> {
  where(filter: {[key: string]: any}): this

  skip(skip: number): this

  sort(sort: number): this

  limit(limit: number): this

  listen(...models: string[]): this

  subscribe(callback: (value: T) => Promise<any>): this

  unsubscribe(callback: (value: T) => Promise<any>): this
}

export interface IAccessorUndiscriminatedMutationBuilder<T> extends IAccessorBuilderBase<T> {
  withRecord(record: T & { _id: string }): this

  withRecords(...records: (T & { _id: string })[]): this

  withRecords(records: (T & { _id: string })[]): this

  withId(id: string): this

  withIds(...ids: string[]): this

  withIds(ids: string[]): this
}

type ModelQueryBuilders<T> = {
  get: IAccessorReadBuilder<T>
  find: IAccessorReadBuilder<T>
  read: IAccessorReadBuilder<T>

  list: IAccessorManyReadBuilder<T[]>
  readMany: IAccessorManyReadBuilder<T[]>

  count: IAccessorCountBuilder<number>
}

type ModelMutationBuilders<T> = {
  create: IAccessorCreationBuilder<T>
  createMany: IAccessorManyCreationBuilder<T[]>

  update: IAccessorUpdateBuilder<T>
  updateMany: IAccessorManyUpdateBuilder<T[]>

  delete: IAccessorDeletionBuilder<T>
  deleteMany: IAccessorManyDeletionBuilder<T[]>
}

export interface IAccessor<T> {
  query: ModelQueryBuilders<T>
  mutate: ModelMutationBuilders<T>
}
