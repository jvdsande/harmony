import { QuerySelect } from 'query'

export interface IAccessorBuilderBase {
  select(selection: QuerySelect): this
  then(callback: (value: Record<string, any>) => Promise<any>): Promise<any>
  catch(callback: (error: Error) => Promise<any>): Promise<any>
  finally(callback: () => void): Promise<any>
}

export interface IAccessorSubscribableBuilderBase extends IAccessorBuilderBase{
  listen(...models: string[]): this
  subscribe(callback: (value: Record<string, any>) => Promise<any>): this
  unsubscribe(callback: (value: Record<string, any>) => Promise<any>): this
}

export interface IAccessorCountBuilder extends IAccessorSubscribableBuilderBase {
  where(filter: Record<string, any>): this
}

export interface IAccessorReadBuilder extends IAccessorCountBuilder {
  // where
  skip(skip: number): this
  sort(sort: number): this
}

export interface IAccessorManyReadBuilder extends IAccessorReadBuilder {
  // where
  // skip
  // sort
  limit(limit: number): this
}

export interface IAccessorCreationBuilder extends IAccessorBuilderBase {
  withRecord(record: Record<string, any>): this
}

export interface IAccessorManyCreationBuilder extends IAccessorBuilderBase {
  withRecords(...records: Record<string, any>[]): this
  withRecords(records: Record<string, any>[]): this
}

export interface IAccessorUpdateBuilder extends IAccessorCreationBuilder {
  // withRecord
  withId(id: string): this
}

export interface IAccessorManyUpdateBuilder extends IAccessorManyCreationBuilder {
  // withRecords
}

export interface IAccessorDeletionBuilder extends IAccessorBuilderBase {
  withId(id: string): this
}

export interface IAccessorManyDeletionBuilder extends IAccessorBuilderBase {
  withIds(...ids: string[]): this
  withIds(ids: string[]): this
}

export type IAccessorQueryBuilder = IAccessorCountBuilder|IAccessorReadBuilder|IAccessorManyReadBuilder
export type IAccessorMutationBuilder = IAccessorCreationBuilder|IAccessorUpdateBuilder|IAccessorDeletionBuilder|
                                      IAccessorManyCreationBuilder|IAccessorManyUpdateBuilder|IAccessorManyDeletionBuilder


export interface IAccessorUndiscriminatedQueryBuilder extends IAccessorManyReadBuilder {}

export interface IAccessorUndiscriminatedMutationBuilder extends IAccessorBuilderBase {
  withRecord(record: Record<string, any>): this
  withRecords(...records: Record<string, any>[]): this
  withRecords(records: Record<string, any>[]): this
  withId(id: string): this
  withIds(...ids: string[]): this
  withIds(ids: string[]): this
}

type ModelQueryBuilders = {
  get: IAccessorReadBuilder
  find: IAccessorReadBuilder
  read: IAccessorReadBuilder

  list: IAccessorManyReadBuilder
  readMany: IAccessorManyReadBuilder

  count: IAccessorCountBuilder
}

type ModelMutationBuilders = {
  create: IAccessorCreationBuilder
  createMany: IAccessorManyCreationBuilder

  update: IAccessorUpdateBuilder
  updateMany: IAccessorManyUpdateBuilder

  delete: IAccessorDeletionBuilder
  deleteMany: IAccessorManyDeletionBuilder
}

export interface IAccessor {
  query: ModelQueryBuilders
  mutate: ModelMutationBuilders
}
