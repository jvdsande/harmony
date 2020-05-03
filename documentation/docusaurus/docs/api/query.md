---
title: HarmonyJS Query
sidebar_label: "@harmonyjs/query"
---

`@harmonyjs/query` is a helper for building frontend backed by an HarmonyJS server. It handles creating and running
GraphQL queries through simple-to-use builders, as well as subscribing to Socket.IO events for reactivity.

## Default export

The default export from `@harmonyjs/query` is a ready-to-use instance of [`IClient`](#iclient). This instance exposes functions
to build low-level GraphQL queries and Socket.IO subscriptions, as well as builders for simpler queries and mutations.

It is also possible to fork the instance through the [`IClient::fork`](#iclientfork) getter, in order to handle multiple
backend connections at the same time

<b style={{display: "block", marginBottom: "-1.5rem" }}>Sample usage</b>

```js
import Client from '@harmonyjs/query'

// Connect the shared instance
Client.configure({
    token: `user-jwt-token`,
    endpoint: {
        host: 'localhost',
        port: 3000,
    },
    path: {
        graphql: '/graphql',
        socket: '/harmonyjs-socket',
    }
})

// Run a low-level GraphQL query
Client.query({
    modelList: {
        args: {},
        select: { _id: true },
    }
})
    .then((result) => {
        // As this was a classic GraphQL query, the result is nested in `modelList`. We could have launched multiple queries in the same request.
        console.log(result.modelList)
    })

// Use a builder for more readable syntax
Client.builder
    .withName('modelList')
    .withArgs({})
    .withSelection({
        _id: true,
    })
    .asQuery()
    .then((result) => {
        // Using IQueryBuilder::asQuery, the unique query is automatically unwrapped and passed as result, no need to access nested field
        console.log(result)
    })
```

## Other exports

`@harmonyjs/query` also exports another helper, even higher-level than `IClient::builder`: the `Accessor(): IAccessor` factory.

### `Accessor`

`Accessor` allows the creation of a high-level builder dedicated to building CRUD operations on a specific model. It also allows
subscriptions for the built queries, directly connected to Socket.IO model-update events.

Checkout the [`IAccessor`](#iaccessor) type definition for a full list of available builders.

<b style={{display: "block", marginBottom: "-1.5rem" }}>Sample usage</b>

```js
import { Accessor } from '@harmonyjs/query'

// Using the default Client exported by `@harmonyjs/query`
const ModelAccessor = Accessor('model')

ModelAccessor.query
    .list
    .select({
        _id: true
    })
    .then((result) => {
        // As with IClient::builder, results are automatically unwrapped
        console.log(result)
    })

// Using a custom IClient instance
const ModelAccessorCustomClient = Accessor('model', customClient)
```


## Referenced types

### `IClient`

The `IClient` type is the type of the default `@harmonyjs/query` export as well as instances forked through the `IClient::instance`
function.

```ts
interface IClient {
  configure(configuration: ClientConfiguration): this
  close(): Promise<void>

  query<T = {[key: string]: any}>(query: QueryDefinition): Promise<T>
  mutation<T = {[key: string]: any}>(mutation: QueryDefinition): Promise<T>

  subscribe(event: string, callback: Function): this
  unsubscribe(event: string, callback: Function): this

  builder: IQueryBuilder<any>
  fork: IClient
}
```
> Jump to:
[`ClientConfiguration`](#clientconfiguration),
[`QueryDefinition`](#querydefinition),
[`IQueryBuilder`](#iquerybuilder)

#### `IClient::configure`

Function initializing the client instance. This must be called at least once before trying to run a query. It can be called multiple times, for
updating the instance's configuration. See [`ClientConfiguration`](#clientconfiguration) for available options.

#### `IClient::close`

Completely close the client's connection, including unsubscribing all Socket.IO events.

#### `IClient::query`

Lowest-level query function, executes the given GraphQL query. GraphQL queries are constructed in JS using the [`QueryDefinition`](#querydefinition)
interface.

This function returns a Promise that resolves with the query's result.

#### `IClient::mutation`

Lowest-level mutation function, executes the given GraphQL mutation. GraphQL mutations are constructed in JS using the [`QueryDefinition`](#querydefinition)
interface.

This function returns a Promise that resolves with the mutation's result.

#### `IClient::subscribe`

Register an event listener for the specified Persistence event. See [`IEvents`](/docs/api/persistence/#ievents) for more info about events.

#### `IClient::unsubscribe`

Removes a previously registered listener for the specified Persistence event. The passed callback is checked by reference.

#### `IClient::builder`

Getter returning a new [builder](#iquerybuilder) each time it is called. The created builder is initialized to use the `IClient`
that created it. See [`IQueryBuilder`](#iquerybuilder) for more information.

#### `IClient::fork`

Getter returning a new [client](#iclient) each time it is called. The primary aim is to fork the main client when multiple, specific clients
are needed.

<br />

---

### `ClientConfiguration`

Configuration object used to setup a [`IClient`](#iclient) through the `IClient::configure` function.

```ts
type ClientConfiguration = {
  graphql?: {
    host?: string
    port?: string|number
    path?: string
    headers?: {
      [key: string]: string
    }
    fetchPolicy?: 'network-only' | 'cache-first'
  }
  socket?: {
    host?: string
    port?: string|number
    path?: string
  }
}
```

#### `ClientConfiguration::graphql`

Optional field for configuring the GraphQL endpoint to connect to.

##### `ClientConfiguration::graphql::host`

Host where the GraphQL endpoint is situated. Defaults to `''`, meaning the GraphQL
endpoint is on the server serving the client.

##### `ClientConfiguration::graphql::port`

Port on which to connect to the endpoint. Defaults to `''`.

##### `ClientConfiguration::graphql::path`

Path on which the GraphQL endpoint is served. Defaults to `/graphql`.

##### `ClientConfiguration::graphql::headers`

Optional headers map to be passed to the GraphQL requests. Useful for instance
to set the authentication header.

##### `ClientConfiguration::graphql::fetchPolicy`

Apollo fetch-policy to use. Defaults to `network-only`.

#### `ClientConfiguration::socket`

Optional field for configuring the Socket.IO endpoint to connect to.

##### `ClientConfiguration::socket::host`

Host where the Socket.IO endpoint is situated. Defaults to `''`, meaning the Socket.IO
endpoint is on the server serving the client.

##### `ClientConfiguration::socket::port`

Port on which to connect to the endpoint. Defaults to `''`.

##### `ClientConfiguration::socket::path`

Path on which the Socket.IO endpoint is served. Defaults to `/harmonyjs-socket`.

<br />

---

### `QueryDefinition`

The `QueryDefinition` type is used to describe a GraphQL query or mutation using JavaScript.
It tries to closely match the GraphQL syntax, using `: true` to mark fields to get.

```ts
type QuerySelect = {
  [key: string]: boolean | QuerySelect | QueryField
}

type QueryArgs = {
  [key: string]: any
}

type QueryField = {
  alias?: string,
  args?: QueryArgs,
  select?: QuerySelect,
}

type QueryDefinition = {
  [key: string]: QueryField | boolean
}
```

<br />

---

### `IQueryBuilder`

The `IQueryBuilder` interface is the type returned from the `IClient::builder` getter.
It is a full-fledged builder of `QueryDefinition`, allowing a more readable and composable
way of creating complex queries.

It can optionally take a generic type parameter to type the return value of the query or mutation
promise.

```ts
interface IQueryBuilder<T = {[key: string]: any}> {
  withName(name?: string): this
  withAlias(name?: string): this
  withArgs(args?: QueryArgs): this
  withSelection(selection?: QuerySelect): this
  build(): QueryDefinition

  asQuery(): Promise<T>
  asMutation(): Promise<T>

  combineQueries(queries: IQueryBuilder[]): Promise<{[key: string]: any}[]>
  combineMutations(mutations: IQueryBuilder[]): Promise<{[key: string]: any}[]>
}
```
> Jump to:
[`QueryArgs`](#querydefinition),
[`QuerySelect`](#querydefinition),
[`QueryDefinition`](#querydefinition)

#### `IQueryBuilder::withName`

Sets the name of the query or mutation to run.

#### `IQueryBuilder::withAlias`

Allows setting an alias for the query or mutation, useful when combining
queries in one call.

#### `IQueryBuilder::withArgs`

Sets the arguments for the query or mutation

#### `IQueryBuilder::withSelection`

Sets the selection for the query or mutation

#### `IQueryBuilder::build`

Builds the current query, returning a configured `QueryDefinition`

#### `IQueryBuilder::asQuery`

Builds and executes the current query as a GraphQL query. This is a shorthand for calling `IQueryBuilder::build`
then passing the resulting `QueryDefinition` to `IClient::query`

#### `IQueryBuilder::asMutation`

Builds and executes the current query as a GraphQL mutation. This is a shorthand for calling `IQueryBuilder::build`
then passing the resulting `QueryDefinition` to `IClient::mutation`

#### `IQueryBuilder::combineQueries`

Helper function for running multiple queries from builders in only one server call. Note that it 
ignores the current builder, which is only an interface for calling the function. If the current
builder needs to be part of the query, simply add it to the array of builders passed to the function.

#### `IQueryBuilder::combineMutations`

Helper function for running multiple mutations from builders in only one server call. Note that it 
ignores the current builder, which is only an interface for calling the function. If the current
builder needs to be part of the query, simply add it to the array of builders passed to the function.

<br />

---

### `IAccessor`

The `IAccessor` interface represents the object returned by the [`Accessor`](#accessor) factory.

It allows to easily construct and launch CRUD operations on a chosen model.

```ts
interface IAccessor {
  query: ModelQueryBuilders
  mutate: ModelMutationBuilders
}
```
> Jump to:
[`ModelQueryBuilders`](#modelquerybuilders),
[`ModelMutationBuilders`](#modelmutationbuilders)

#### `IAccessor::query`

Getter to a configured `ModelQueryBuilders` object, allowing to call _read_ CRUD operations.

#### `IAccessor::mutate`

Getter to a configured `ModelMutationBuilders` object, allowing to call _write_ CRUD operations.


<br />

---

### `ModelQueryBuilders`

The `ModelQueryBuilders` object is a collection of getters, each providing a dedicated
builder for a given CRUD _read_ operation. See the builders' type definition for more information
on each builders.

```ts
type ModelQueryBuilders = {
  get: IAccessorReadBuilder
  find: IAccessorReadBuilder
  read: IAccessorReadBuilder

  list: IAccessorManyReadBuilder
  readMany: IAccessorManyReadBuilder

  count: IAccessorCountBuilder
}
```
> Jump to:
[`IAccessorReadBuilder`](#iaccessorreadbuilder),
[`IAccessorManyReadBuilder`](#iaccessormanyreadbuilder),
[`IAccessorCountBuilder`](#iaccessorcountbuilder)

<br />

---

### `ModelMutationBuilders`

The `ModelMutationBuilders` object is a collection of getters, each providing a dedicated
builder for a given CRUD _write_ operation. See the builders' type definition for more information
on each builders.

```ts
type ModelMutationBuilders = {
  create: IAccessorCreationBuilder
  createMany: IAccessorManyCreationBuilder

  update: IAccessorUpdateBuilder
  updateMany: IAccessorManyUpdateBuilder

  delete: IAccessorDeletionBuilder
  deleteMany: IAccessorManyDeletionBuilder
}
```
> Jump to:
[`IAccessorCreationBuilder`](#iaccessorcreationbuilder),
[`IAccessorManyCreationBuilder`](#iaccessormanycreationbuilder),
[`IAccessorUpdateBuilder`](#iaccessorupdatebuilder),
[`IAccessorManyUpdateBuilder`](#iaccessormanyupdatebuilder),
[`IAccessorDeletionBuilder`](#iaccessordeletionbuilder),
[`IAccessorManyDeletionBuilder`](#iaccessormanydeletionbuilder),

<br />

---

### `IAccessorBuilderBase`

Interface common to all builders. It provides a `select` function for setting the query's selection,
as well as the standard `PromiseLike` interface so that builders are directly awaitable.

All _mutation_ builders directly inherits from `IAccessorBuilderBase`. _query_ builders inherits from the
[`IAccessorSubscribableBuilderBase`](#iaccessorsubscribablebuilderbase).

```typescript
interface IAccessorBuilderBase<T> {
  select(selection: QuerySelect): this

  then<R>(callback: (value: T) => R): Promise<R>

  catch(callback: (error: Error) => any): Promise<any>

  finally(callback: () => void): any
}
```

#### `IAccessorBuilderBase::select`

Sets the selection of the built query.

#### `IAccessorBuilderBase::then`

Builds the query and executes it, returning the `Promise` from `IClient::query` or `IClient::mutation`.

#### `IAccessorBuilderBase::catch`

Builds the query and executes it, returning the `Promise` from `IClient::query` or `IClient::mutation`
chained with the provided `catch` method.

#### `IAccessorBuilderBase::finally`

Builds the query and executes it, returning the `Promise` from `IClient::query` or `IClient::mutation`
chained with the provided `finally` method.


<br />

---

### `IAccessorSubscribableBuilderBase`

This extension to `IAcessorBuilderBase` is used by builders creating _subscribable_ queries. Those are
all the _read_ CRUD operations. In addition to being thenable, _subscribable_ queries can be subscribed
to, the given callback being called each time the underlying data changes.

```typescript
interface IAccessorSubscribableBuilderBase<T> extends IAccessorBuilderBase<T> {
  subscribe(callback: (value: T) => Promise<any>): this

  unsubscribe(callback: (value: T) => Promise<any>): this

  listen(...models: string[]): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorSubscribableBuilderBase::subscribe`

Register a new callback listener for the current query, activating the subscription if it
is the first listener.

#### `IAccessorSubscribableBuilderBase::unsubscribe`

Unregister a callback listener from the current query, deactivating the subscription if it
was the last listener.

#### `IAccessorSubscribableBuilderBase::listen`

By default, a _subscribable_ builder only subscribes for change events regarding the underlying
`Accessor`'s model. To listen for changes from other models, for instance referenced models,
pass the model names to the `listen` function.

Each call to the function replaces the models to listen to, it does not append the new models to
the previously listened models.

The underlying `Accessor`'s model is always listened to, even after calling `listen`.

<br />

---

### `IAccessorCountBuilder`

Creates a `count` CRUD query.

```typescript
interface IAccessorCountBuilder<T> extends IAccessorSubscribableBuilderBase<T> {
  where(filter: Record<string, any>): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase),
[`IAccessorBuilderBase`](#iaccessorsubscribablebuilderbase)

#### `IAccessorCountBuilder::where`

Filter to apply for the count operation.

<br />

---

### `IAccessorReadBuilder`

Creates a `read` CRUD query.

```typescript
interface IAccessorReadBuilder<T> extends IAccessorSubscribableBuilderBase<T> {
  where(filter: Record<string, any>): this

  skip(skip: number): this

  sort(sort: {[field: string]: number}): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase),
[`IAccessorBuilderBase`](#iaccessorsubscribablebuilderbase)

#### `IAccessorReadBuilder::where`

Filter to apply for the read operation.

#### `IAccessorReadBuilder::skip`

Number of items to skip if multiple items match the filter.

#### `IAccessorReadBuilder::sort`

Fields to sort by for the given query.

<br />

---

### `IAccessorManyReadBuilder`

Creates a `read-many` CRUD query.

```typescript
interface IAccessorManyReadBuilder<T> extends IAccessorSubscribableBuilderBase<T> {
  where(filter: Record<string, any>): this

  skip(skip: number): this

  limit(limit: number): this

  sort(sort: number): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase),
[`IAccessorBuilderBase`](#iaccessorsubscribablebuilderbase)

#### `IAccessorManyReadBuilder::where`

Filter to apply for the list operation.

#### `IAccessorManyReadBuilder::skip`

Number of items to skip if multiple items match the filter.

#### `IAccessorManyReadBuilder::limit`

Max number of items to return if multiple items match the filter.

Use `skip` and `limit` together to handle paginated queries.


#### `IAccessorManyReadBuilder::sort`

Fields to sort by for the given query.


<br />

---

### `IAccessorCreationBuilder`

Creates a `create` CRUD query.

```typescript
interface IAccessorCreationBuilder<T> extends IAccessorBuilderBase<T> {
  withRecord(record: Record<string, any>): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorCreationBuilder::withRecord`

New object to create.

<br />

---

### `IAccessorManyCreationBuilder`

Creates a `create-many` CRUD query.

```typescript
interface IAccessorManyCreationBuilder<T> extends IAccessorBuilderBase<T> {
  withRecords(...records: Record<string, any>[]): this

  withRecords(records: Record<string, any>[]): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorManyCreationBuilder::withRecords`

Array of objects to create, either directly as an array, or as a variadic argument.

<br />

---

### `IAccessorUpdateBuilder`

Creates an `update` CRUD query.

```typescript
interface IAccessorUpdateBuilder<T> extends IAccessorBuilderBase<T> {
  withId(id: string): this

  withRecord(record: Record<string, any>): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorUpdateBuilder::withId`

ID of the object to update. Needs to be called for each update operation.

#### `IAccessorUpdateBuilder::withRecord`

Updated objects. Omitted fields will be left untouched. Fields set to `null` will be deleted.

<br />

---

### `IAccessorManyUpdateBuilder`

Creates an `update-many` CRUD query.

```typescript
interface IAccessorManyUpdateBuilder<T> extends IAccessorBuilderBase<T> {
  withRecords(...records: Record<string, any>[]): this

  withRecords(records: Record<string, any>[]): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorManyUpdateBuilder::withRecords`

Array of objects to update, either directly as an array, or as a variadic argument.

Each record must have an ID.

<br />

---

### `IAccessorDeletionBuilder`

Creates a `delete` CRUD query.

```typescript
interface IAccessorDeletionBuilder<T> extends IAccessorBuilderBase<T> {
  withId(id: string): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorDeletionBuilder::withId`

ID of the object to delete.

<br />

---

### `IAccessorManyDeletionBuilder`

Creates a `delete-many` CRUD query.

```typescript
interface IAccessorManyDeletionBuilder<T> extends IAccessorBuilderBase<T> {
  withIds(...ids: string[]): this

  withIds(ids: string[]): this
}
```
> Jump to:
[`IAccessorBuilderBase`](#iaccessorbuilderbase)

#### `IAccessorManyDeletionBuilder::withIds`

Array of IDs of objects to delete, either directly as an array, or as a variadic argument.
