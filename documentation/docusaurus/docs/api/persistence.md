---
title: HarmonyJS Persistence
sidebar_label: "@harmonyjs/persistence"
---

`@harmonyjs/persistence` handles the data of our application. It provides a convenient way to describe our models, and
connect them to our databases through adapters.

_**Note:** While not mandatory, [GraphQL](https://graphql.org/) is the main target of the Persistence module, and is needed_
_to take full advantage of HarmonyJS_


## Default export

`@harmonyjs/persistence` default export is the `Persistence() : PersistenceInstance` factory.

This factory allows us to create a [`PersistenceInstance`](#persistenceinstance) object, which can be configured to handle our application's data.

The signature of the factory is as follows:

```ts
Persistence<
 Models extends {[model: string]: Model} = any,
>() : PersistenceInstance<Models>
```

It takes an optional Models map allowing to type some aspects of the generated `PersistenceInstance`.

<b style={{display: "block", marginBottom: "-1.5rem" }}>Sample usage</b>

```js
import Persistence from '@harmonyjs/persistence'

async function run() {
    // Create a new Persistence instance
    const persistence = Persistence()

    console.log('Initializing the Persistence instance...')

    // Start our Persistence instance
    await persistence.initialize({
        models: {...},
        adapters: {...},
    })

    console.log('Persistence instance initialized!')
}

run()
```

## Other exports

### `Types`

`@harmonyjs/persistence` also has another, named export: the `Types` factories. This object follows the following interface:

```
interface ITypes {
    String: IPropertyString
    Number: IPropertyNumber
    Float: IPropertyFloat
    Boolean: IPropertyBoolean
    ID: IPropertyID
    JSON: IPropertyJSON
    Date: IPropertyDate
    Reference: { of(model: string) : IPropertyReference }
    ReversedReference: { of(model: string): { on(field: string): IPropertyReversedReference }, on(field: string): { of(model: string): IPropertyReversedReference } }
    Schema: { of(schema: Schema): IPropertySchema }
    Array: { of(type: SchemaField): IPropertyArray }
    Scalar(name: string): IPropertyScalar
}
```

Each member of `Types` is a factory for a specific `IProperty{Kind}`.

`IProperty` is an internal type of `@harmonyjs/persistence` describing a correct, sanitized Property in a schema.

`IProperty{Kind}` is a specialized `IProperty` containing a specific type.

<b style={{display: "block", marginBottom: "-1.5rem" }}>Sample usage</b>

```js
import { Types } from '@harmonyjs/persistence'

const schema = {
    someString: Types.String,
    someBoolean: Types.Boolean,
    someReference: Types.Reference.of('some-model'),
    someNestedSchema: Types.Schema.of({
        someNestedFloat: Types.Float,
        someNestedDate: Types.Date,
    }),
}

export default schema
```

### `field` and `query`

`@harmonyjs/persistence` exports two special helper functions: `field` and `query`.

Those functions are needed when using TypeScript in order to take advantage of type inferrence when defining [`ComputedField`](#computedfield)
and [`ComputedQuery`](#computedquery) objects. Wrapping such an object definition in the `field` function (for `ComputedField`) or the `query` function (for `ComputedQuery`)
will automatically type the `resolve`, `scopes` and `transforms` properties based on the `args` and `type` properties.

## Exported types

Here is the list of all types exported by the `@harmonyjs/persistence` package, related to the persistence instance itself.

`@harmonyjs/persistence` also export types related to [Adapters](/plugins/adapters), but those are described in the Adapters documentation.


### `PersistenceConfig`

The `PersistenceConfig` object allows us to configure a Persistence instance. Here are the available options:

```ts
type PersistenceConfig = {
  models: {[name: string]: Model}
  adapters: {[name: string]: IAdapter}
  scalars: {[name: string]: GraphQLScalarType}
  defaultAdapter: string
  strict: boolean
  log: LoggerConfig
}
```
> Jump to:
[`Model`](#model),
[`IAdapter`](/plugins/adapters#iadapter),
[`GraphQLScalarType`](https://graphql.org/graphql-js/type/#graphqlscalartype),
[`LoggerConfig`](/api/logger#loggerconfig)

#### `PersistenceConfig::models`

Map of named [`Models`](#model) describing the data handled by the Persistence instance. The key is the name of the model used
later on throughout the code when retrieving models.

#### `PersistenceConfig::adapters`

Map of named [`Adapters`](/plugins/adapters) connecting the Persistence instance to databases. The key in the map is the
name of the adapter, used either to set a [`Model`](#model)'s specific adapter, or the default adapter using the next field.

#### `PersistenceConfig::defaultAdapter`

Default adapter name. If not provided, the first key found in the map will be used as default. If the map is empty, a `mock`
adapter will be used, mocking the schema.

#### `PersistenceConfig::strict`

Flag allowing the use of `strict` mode. `strict` mode results in CRUD queries and mutations only being generated in the output schema
if a `Scope` has been provided. See [`Scope`](#scope) for more details.

#### `PersistenceConfig::log`

Configuration of the way the persistence instance logs its actions. Refer to the [Log util documentation](/api/logger#loggerconfig)

<br />

---

### `PersistenceInstance`

The `PersistenceInstance` type represents the object returned when instantiating an `@harmonyjs/persistence`. It mostly exposes
lifecycle functions, as well as underlying elements such as the GraphQL resolvers or custom Controllers to be used with an `@harmonyjs/server` instance.

After creating a new `PersistenceInstance`, only the `initialize` field is available. Accessing any other field will throw.
Other fields become available _after_ calling `PersistenceInstance::initialize`.

```ts
type PersistenceInstance<
  Models extends {[model: string]: Model} = any,
> = {
  readonly configuration: PersistenceConfig<Models>
  readonly logger: ILogger

  readonly models: SanitizedModel[]

  readonly events: IEvents
  readonly context: PersistenceContext
  readonly resolvers: {
    [model in keyof Models]: ModelResolvers<Models[model]>
  }

  readonly controllers: {
    ControllerGraphQL: Controller<{
      path: string
      enablePlayground: boolean
      apolloConfig?: ApolloServerConfig
      routeConfig?: Fastify.RouteOptions
      authentication?: { validator: string } & Controller<any>
    }>
    ControllerEvents: Controller<void>
  }

  initialize(configuration: Partial<PersistenceConfig<Models>>): Promise<void>
  close(): Promise<void>
}
```
> Jump to:
[`PersistenceConfig`](#persistenceconfig),
[`ILogger`](/api/logger#ilogger),
[`Model`](#model)
[`SanitizedModel`](#sanitizedmodel),
[`IEvents`](#ievents),
[`PersistenceContext`](#persistencecontext),
[`ModelResolvers`](#modelresolvers),
[`Controller`](/plugins/controllers),
[`ApolloServerConfig`](https://www.apollographql.com/docs/apollo-server/api/apollo-server/#parameters),
[`Fastify.RouteOptions`](https://www.fastify.io/docs/latest/Routes/#options)

#### `PersistenceInstance::configuration`

Expose the currently applied configuration, which is the result of a merge between the configuration passed during initialization,
and the default configuration.

#### `PersistenceInstance::logger`

Expose the underlying logger, in order to be able to add custom logs using the Persistence namespace.

#### `PersistenceInstance::models`

Expose the computed Persistence models, as [`SanitizedModels`](#sanitizedmodel), which are compiled from the provided raw
[`Models`](#model).

#### `PersistenceInstance::events`

Expose the instance's Events handler, primarily used in [`Adapters`](/plugins/adapters) to signal an updated, created or
deleted document.

#### `PersistenceInstance::context`

Expose the instance's Context object, which is compiled for each request before being passed to GraphQL's resolvers.
See the [`PersistenceContext`](#persistencecontext) definition for more information.

#### `PersistenceInstance::resolvers`

Provide a map of resolvers by models. Each entry is an object containing the model's basic CRUD resolvers. See [`ModelResolvers`](#modelresolver)
for more information.

#### `PersistenceInstance::controllers`

The `Persistence::controllers` object exposes two ready-to-use Controllers:
- `PersistenceInstance::controllers::ControllerGraphQL` can be used to expose a GraphQL endpoint configured with the Persistence instance schema.
Its constructor accepts one `configuration` argument, of the following type:
```ts
{
    path: string // The route on which to expose the GraphQL endpoint
    enablePlayground: boolean // Whether to enable the GraphQL Playground page on the endpoint
    apolloConfig?: ApolloServerConfig // An optional Apollo Server configuration to be merged with the default configuration
    routeConfig?: Fastify.RouteOptions // An optional Fastify Route configuration to be merge with the default configuration
    authentication?: { validator: string } & Controller<any> // An optional Authentication Controller to be used as the authentication mechanism
}
```
- `PersistenceInstance::controllers::ControllerEvents` can be used to forward our data events to the application's Socket.IO layer. It doesn't require
any configuration.

#### `PersistenceInstance::initialize`

Function accepting a PersistenceConfig object and launching the persistence instance with the given configuration.

The function actually takes a Partial representation of a PersistenceConfig object, meaning that each field is optional.
Non-provided mandatory fields will be filled with sensible default values.

Returns a Promise resolving once everything is correctly setup.

#### `PersistenceInstance::close`

Function closing the Persistence instance, closing all connections to underlying databases through adapters.

<br />

---

### `Model`

The `Model` type is used to describe a type of document handled by the Persistence instance. It has the following structure:

```ts
type Model = {
  schema: Schema

  computed?: Computed
  scopes?: Scopes
  transforms?: Transforms

  external?: boolean
  adapter?: string

  // A model can be extended with any kind of properties
  [key: string]: any
}
```
> Jump to:
[`Schema`](#schema),
[`Computed`](#computed),
[`Scopes`](#scopes),
[`Transforms`](#transforms),

#### `Model::schema`

The schema describing what a document of this model looks like. This schema uses specific `Types` provided by HarmonyJS, which
enables the framework to understand it and convert it to various underlying structure: [Adapters](/plugins/adapters)'s specific typing system,
GraphQL schema and resolvers, etc...

Fields described in the Schema are primitive fields which should be stored in the underlying database.

#### `Model::computed`

The `computed` field allows to extend a model's capability beyond its schema by providing fields computed during runtime by merging
schema values (or by doing any other specific computing).

To learn how to use this field, refer to the [Computed](#computed) documentation.

#### `Model::scopes`

The `scopes` field is used to define access scopes for all basic CRUD functions created by HarmonyJS. A scope function receives
the arguments passed to the query by a client, and returns a new set of arguments sanitized by any means necessary.

The scope function is asynchronous, so any verification can be done. Be careful though, as the scope will be run for each query
and should therefore be as fast as possible.

#### `Model::transforms`

The `transforms` field is used to define result sanitation for all basic CRUD functions created by HarmonyJS. A transform function receives
the result from the underlying resolver, and returns a new result sanitized by any means necessary.

The transform function is asynchronous, so any modification can be done. Be careful though, as the transform will be run for each query
and should therefore be as fast as possible.

#### `Model::adapter`

The `adapter` field should be a key from the Persistence instance Adapters map. If no adapter is provided for a model,
the instance's default adapter will be used

#### `Model::external`

The `external` boolean is only necessary for building a Federated service using [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/).

Setting this boolean to `true` will tell HarmonyJS to mark the resulting GraphQL types as external, as well as not provide
default CRUD resolvers for this model which is handled by another service.

<br />

---

### `Schema`

The `Schema` type is used to define the `schema` field of a `Model`. It follows the following structure:

```ts
export type SchemaField = IProperty | Schema | SchemaField[]
export type Schema = {
  [field: string]: SchemaField
}
```

`IProperty` is an internal type of `@harmonyjs/persistence` describing a correct, sanitized Property in a schema.

A schema is a map of `SchemaField`s.

A `SchemaField` is any valid child of a `Schema`, which includes :
- A valid `IProperty` (as returned by the [`Types`](#types) Factories)
- Another nested `Schema`
- An array of `SchemaField`, more precisely an array with only one element which is a `SchemaField`

<br />

---

### `Computed`

As mentioned in the [`Model`](#model) description, the `Computed` type is used to describe computed fields for a given schema.

It also allows the definition of specific `Queries` and `Mutations` for the generated GraphQL schema.

```ts
type Computed<
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> = {
  fields?: {
    [field: string]: ComputedField<Context, Schemas, CurrentSchema>
  }
  queries?: {
    [field: string]: ComputedQuery<Context, Schemas, CurrentSchema>
  }
  mutations?: {
    [field: string]: ComputedQuery<Context, Schemas, CurrentSchema>
  }
  custom?: {
    [type: string]: Resolvers<Context, Schema>
  }
}
```
> Jump to:
[`Schema`](#schema),
[`ComputedField`](#computedfield),
[`ComputedQuery`](#computedquery),
[`Resolvers`](#resolvers)

The `Computed` type is generic, and the three optional generic types can be used to enforce arguments and return types for resolvers
when using TypeScript.

#### `Computed::fields`

`Computed::fields` is a map of [`ComputedField`](#computedfield).
Each `ComputedField` is a description of a new property to append to the model's schema for output operations.

#### `Computed::queries`

`Computed::queries` define fields that will be injected to the `Query` type of the resulting GraphQL schema.
Except when using `extends` (see [`ComputedQuery`](#computedquery)), the queries are not actually linked to the model they are defined on.
However by convention, it is a best practice to keep all queries related to a model in the model definition.

#### `Computed::mutations`

`Computed::mutations` works exactly the same as [`Computed::queries`](#computedqueries), but for GraphQL mutations.

#### `Computed::custom`

For advanced use only, the `Computed::custom` field allows anyone to inject arbitrary field resolvers for arbitrary types.

It is a map of map of resolver functions, the first level of the map being the type to inject to, and the second level
being the field to resolve.

See [`Resolvers`](#resolvers) for more details.

<br />

---

### `Scopes`

`Scopes` is part of the [`Model`](#model) definition. It is a map of [`Scope`](#scope) functions for each basic CRUD
operation generated by Harmony.

The default resolver for the CRUD operation will be scoped with the provided scope function - even when called through the `resolvers` map of
`Resolver` function, see [`ScopedModelResolvers`](#scopedmodelresolvers).

When using `strict` mode (see [`PersistenceConfig`](#persistenceconfig)), CRUD operators with no `Scope` function defined
in the `Scopes` object won't be added to the root's `Query` or `Mutation` object, and will therefore only be available
internally.

The `Scopes` typing is as follows:

```typescript
export type Scopes<
  Context = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  CurrentSchema extends Schema = any,
> = {
  [R in CrudEnum]?: Scope<
    Context, Schemas, CurrentSchema, ExtendedArgs<R, CurrentSchema>, false
  >
}
```
> Jump to:
[`Schema`](#schema),
[`Scope`](#scope),
[`CrudEnum`](#crudenum),
[`ExtendedArgs`](#extendedargs)

As for the [`Computed`](#computed) type, it can be customized with generics to definitely type the `context`, `resolvers`
and `source` arguments of the `Scope` functions.

<br />

---

### `Transforms`

`Transforms` is part of the [`Model`](#model) definition. It is a map of [`Transform`](#transform) functions for each basic CRUD
operation generated by Harmony.

The result from the default resolver for the CRUD operation will be transformed by the provided transform function - even 
when called through the `resolvers` map of `Resolver` function, see [`ScopedModelResolvers`](#scopedmodelresolvers).

The `Transforms` typing is as follows:

```typescript
export type Transforms<
  Context = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  CurrentSchema extends Schema = any,
> = {
  [R in CrudEnum]?: Transform<
    Context, Schemas, CurrentSchema, ExtendedArgs<R, CurrentSchema>, ExtendedType<R, CurrentSchema>, false
  >
}
```
> Jump to:
[`Schema`](#schema),
[`Transform`](#transform),
[`CrudEnum`](#crudenum),
[`ExtendedArgs`](#extendedargs),
[`ExtendedType`](#extendedtype)

As for the [`Computed`](#computed) type, it can be customized with generics to definitely type the `context`, `resolvers`
and `source` arguments of the `Transform` functions.

<br />

---

### `Resolvers`

`Resolvers` is part of the [`Computed`](#computed) definition, as well as [`SanitizedSchema`](#sanitizedschema).
 It is a map of [`Resolver`](#resolver) functions, the key being the field to resolve.

The `Resolvers` typing is as follows:

```typescript
export type Resolvers<
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
> = {
  [field: string]: Resolver<any, any, any, Context, Schemas>
}
```
> Jump to:
[`Schema`](#schema),
[`Resolver`](#resolver)

As for the [`Computed`](#computed) type, it can be customized with generics to definitely type the `context` and `resolvers`
arguments of the `Resolver` functions.

<br />

---

### `Scope`

A `Scope` function is a function taking the same arguments as a [`Resolver`](#resolver) function, but returning a sanitized
set of arguments instead of the resolved value. It is called before calling the actual `Resolver` function for a given field.

`Scope` functions can be chained, each `Scope` function receiving the arguments outputed by the previous one. They are 
asynchronous, and can therefore depend on asynchronous operations such as database accesses.

They can also be considered as a `pre-resolve` hook, triggering any side-effect necessary.

A `Scope` function follows the following typing:

```typescript
type Scope<
  Context extends any = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  HasResolvers extends boolean = true,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  field: string
} & (false extends HasResolvers ? {

} : {
  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<NonNullable<Schemas>[schema]>}
})) => Promise<(Args|undefined|void)>
```
> Jump to:
[`Schema`](#schema),
[`GraphQLResolveInfo`](https://graphql.org/graphql-js/type/),
[`ScopedModelResolvers`](#scopedmodelresolvers)

*Note: when used as a scope for a basic CRUD operation through the [`Scopes`](#scopes) object, it cannot receive the `resolvers`
argument, which is built _using_ the current scope function.*

<br />

---

### `Transform`

A `Transform` function is a function taking the same arguments as a [`Resolver`](#resolver) function, and returning a sanitized
version of the resolved value. It is called after calling the actual `Resolver` function for a given field.

`Transform` functions can be chained, each `Transform` function receiving the value outputed by the previous one. They are 
asynchronous, and can therefore depend on asynchronous operations such as database accesses.

They can also be considered as a `post-resolve` hook, triggering any side-effect necessary.

A `Transform` function follows the following typing:

```typescript
type Transform<
  Context extends any = any,
  Schemas extends { [key: string]: Schema }|undefined = any,
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  HasResolvers extends boolean = true,
  > = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  field: string
  value: Return|null
  error: Error|null
} & (false extends HasResolvers ? {

} : {
  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<NonNullable<Schemas>[schema]>}
})) => Promise<(Return|undefined|void)>
```
> Jump to:
[`Schema`](#schema),
[`GraphQLResolveInfo`](https://graphql.org/graphql-js/type/),
[`ScopedModelResolvers`](#scopedmodelresolvers)

*Note: when used as a transform for a basic CRUD operation through the [`Transforms`](#transforms) object, it cannot receive the `resolvers`
argument, which is built _using_ the current transform function.*

<br />

---

### `Resolver`

The `Resolver` function type describe the `resolve` fields of `ComputedField` and `ComputedQuery` elements found in a [`Computed`](#computed) object.

It is an asynchronous function charged with retrieving the value of a given field inside a type. It is highly generic
due to the definitely typed nature of the `ComputedField` and `ComputedQuery` objects, but most of the times the generic
arguments are directly and transparently provided by the framework itself.

```ts
type Resolver<
  Source extends any = any,
  Args extends {[key: string]: any}|undefined = {[key: string]: any},
  Return extends any = any,
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
> = (params: {
  source: Source
  args: Args
  context: Context
  info: GraphQLResolveInfo

  resolvers: {[schema in keyof Schemas]: ScopedModelResolvers<Schemas[schema]>}
  field: string
}) => Promise<Return>
```
> Jump to:
[`GraphQLResolveInfo`](https://graphql.org/graphql-js/type/),
[`ScopedModelResolvers`](#scopedmodelresolvers)


#### `Resolver::arg::source`

The `source` argument contains the parent object containing the field to resolve, as currently resolved by the GraphQL engine.
In the case of a `ComputedField`, it is the raw document retrieved from the database. For a `ComputedQuery` it will be `null`
as those are used to describe root queries. Finally in a `custom` `Resolver` it can be any arbitrary object.

When used in a `ComputedField` or `ComputedQuery`, the type of the `source` object can be inferred from the `Schema` generic
passed to the `Computed` type. When used in a `custom` `Resolver`, the type cannot be inferred and will therefore be `any`.

#### `Resolver::arg::args`

The `args` argument holds the arguments passed to the GraphQL field or query, as described in the `args` field of the `ComputedQuery`
or `ComputedField`, if present.

When used in a `ComputedField` or `ComputedQuery`, the type of the `args` object can be inferred from the `args` field of the `ComputedQuery`
or `ComputedField`, if present. When used in a `custom` `Resolver`, the type cannot be inferred and will therefore be `any`.

#### `Resolver::arg::context`

The `context` argument is common to all resolvers and provides access to the current query's [`PersistenceContext`](#persistencecontext).

Its type can always be inferred from the `Context` generic passed to the `Computed` type.

#### `Resolver::arg::info`

The `info` argument is for advanced use only and provides access to GraphQL's [`GraphQLResolveInfo`](https://graphql.org/graphql-js/type/) object.

#### `Resolver::arg::resolvers`

The `resolvers` argument is a map of [`ScopedModelResolvers`](#scopedmodelresolvers), filled accordingly to the map of `Model`s passed to
the `PersistenceInstance`. Those give access to all basic CRUD commands for each `Model`, to be used inside custom resolvers.

Its type can always be inferred from the `Schemas` generic passed to the `Computed` type.

#### `Resolver::arg:field`

This last argument simply contains the name of the field currently being resolved, useful for instance when using a shared
resolver function across several fields but still needing to known _which_ field is being resolved.

<br />

---

### `PropertyMode`

Enumeration defining whether a field should be used in the _output_ or _input_ types.

```ts
export enum PropertyMode {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}
```

<br />

---

### `SchemaOutputType`

The `SchemaOutputType` is a helper type which, given a `Schema`-compliant type, returns the typings of a JavaScript
object which would follow this schema, in the context of an output value of a resolver.

<br />

---

### `SchemaInputType`

The `SchemaInputType` is a helper type which, given a `Schema`-compliant type, returns the typings of a JavaScript
object which would follow this schema, in the context of an input value of a resolver.





## Referenced types

### `SanitizedModel`

```ts
type SanitizedModel = {
  name: string

  schemas: {
    main: IPropertySchema
    computed: IPropertySchema
    queries: IPropertySchema
    mutations: IPropertySchema
  }

  resolvers: {
    computed: Resolvers
    queries: Resolvers
    mutations: Resolvers
    custom: {
      [type: string]: Resolvers
    }
  }

  scopes: Scopes
  transforms: Transforms

  adapter: string
  external: boolean

  [key: string]: any
}
```
> Jump to:
[`IPropertySchema`](#types),
[`Resolvers`](#resolvers),
[`Scopes`](#scopes),
[`Transforms`](#transforms)

The `SanitizedModel` type is the result of importing raw [`Models`](#model) when calling `PersistenceInstance::initialize`.

It is exposed to the outside world as a convenience, for advanced customization.

<br />

---

### `IEvents`

```ts
interface IEvents {
  on(event : string, callback : (args: { document: any, model: SanitizedModel }) => void): void

  off(event : string, callback : (args: { document: any, model: SanitizedModel }) => void): void

  emit({ event, payload } : { event: string, payload: any }): void

  updated({ document, model } : { document: any, model: SanitizedModel }): void

  removed({ document, model } : { document: any, model: SanitizedModel }): void
}
```

This interface is implemented by the `PersistenceInstance::events` field. It is a management interface used either by [`Adapters`](/plugins/adapters)
as a way to signal the update or removal of a document, or by [`Controllers`](/plugins/controllers) to subscribe to those changes.

#### `IEvents::on`

Register a callback for the selected event.

#### `IEvents::off`

Unregister a callback for the selected event.

#### `IEvents::emit`

Emit an event, calling all the registered callbacks by passing them the given payload.

#### `IEvents::updated`

Helper used for emitting the `'updated'` event with a payload made of `{ document, model }`

#### `IEvents::removed`

Helper used for emitting the `'removed'` event with a payload made of `{ document, model }`

<br />

---

### `PersistenceContext`

The `PersistenceContext` type represents the Context provider object used for GraphQL resolvers. Its format is the following:

```
type PersistenceContextValue =
  string | number | boolean | null | { [key: string]: any } | any[]

export type PersistenceContext = {
  [key: string]: PersistenceContextValue | ((args: { request: FastifyRequest, reply: FastifyReply<any> }) => any)
}
```
> Jump to: 
[`FastifyRequest`](https://www.fastify.io/docs/latest/Request/),
[`FastifyReply`](https://www.fastify.io/docs/latest/Reply/)

In other terms, each key is either a primitive, a map object or an array, or a specific function taking the incoming request
and returning anything.

If one wants to provide a function to the GraphQL context, it must be wrapped in another function first since each top-level
functions are executed to get the compiled context for each request.

<br />

---

### `ModelResolver`

```ts
type ModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ((args: Args) => Promise<Return>)

type ModelResolvers<CurrentModel extends Model = Model> = {
  [key in AliasCrudEnum]: ModelResolver<
    ExtendedArgs<key, Model['schema']>,
    ExtendedType<key, Model['schema']>
  >
}
```
> Jump to:
[`AliasCrudEnum`](#crudenum),
[`ExtendedArgs`](#extendedargs)
[`ExtendedType`](#extendedtype)

Exposed as a map in the `PersistenceInstance::resolvers` field, a `ModelResolvers` is a map of default CRUD resolvers (see [`AliasCrudEnum`](#crudenum) for CRUD names).

Those resolvers are implemented in each [`Adapters`](/plugins/adapters) and can be used to retrieve and update documents in databases.

The CRUD operators exposes in a `ModelResolvers` are _unscoped_, meaning that no `Scope` or `Transform` function will be
called when using them.

<br />

---

### `ScopedModelResolver`

```ts
type ScopedModelResolver<
  Args extends {[key: string]: any} = {[key: string]: any},
  Return extends any = any
> = ModelResolver<Args, Return> & { unscoped: ModelResolver<Args, Return> }

type ScopedModelResolvers<CurrentSchema extends Schema = Schema> = {
  [key in AliasCrudEnum]: ScopedModelResolver<
    ExtendedArgs<key, CurrentSchema>,
    ExtendedType<key, CurrentSchema>
  >
}
```
> Jump to:
[`ModelResolver`](#modelresolver),
[`AliasCrudEnum`](#crudenum),
[`ExtendedArgs`](#extendedargs)
[`ExtendedType`](#extendedtype)

`ScopedModelResolvers` is a variant of `ModelResolvers`, but where as the name implies, `Scope` and `Transform` functions
are called. Those are the resolvers used internally and passed for instance inside `Resolver`, `Scope` and `Transform` functions
for custom fields.

Each `ScopedModelResolver` function can be called directly, or through its `unscoped` property to purposely call the _unscoped_ version.

<br />

---

### `ComputedField`

The `ComputedField` type describes a computed field added to a schema. Computed fields are never saved to the underlying
database, and are by default only present in the output type of a schema. They can also be configured as inputs to allow
for customized update and create logic.

Its TypeScript definition is a bit convoluted in order to be definitely typed from the various `Schema`s it takes into account:
the field's arguments, its type, the `Schema` it belongs to... However the final type is actually very straightforward.

Here is the definition of the definitely typed `ComputedField`:

```ts
export type TypedComputedField<
  Context extends any,
  Schemas extends { [key: string]: Schema },
  CurrentSchema extends Schema,
  Args extends Schema | undefined,
  Return extends SchemaField,
> = {
  type: Return
  args?: Args
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope<
    Context,
    Schemas,
    SchemaOutputType<CurrentSchema>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>>[]
  transforms?: Transform<
    Context,
    Schemas,
    SchemaOutputType<CurrentSchema>,
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>>[]

  resolve?: Resolver<SchemaOutputType<CurrentSchema> & (
      unknown extends CurrentSchema['_id'] ? { _id: string } : {}
    ),
    undefined extends Args ? undefined : SchemaInputType<NonNullable<Args>>,
    Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<Return>,
    Context,
    Schemas
  >
}

export type ComputedField<
  Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> = TypedComputedField<Context, Schemas, CurrentSchema, any, any>
```

For the sake of readability, here is the _non-generic_ version of `ComputedField`:

```ts
type ComputedField {
  type: SchemaField
  args?: Schema
  mode?: PropertyMode | PropertyMode[]

  scopes?: Scope[]
  transforms?: Transform[]

  resolve?: Resolver
}
```
> Jump to:
[`Schema`](#schema),
[`SchemaField`](#schema),
[`PropertyMode`](#propertymode),
[`Scope`](#scope),
[`Transform`](#transform),
[`Resolver`](#resolver)

#### `ComputedField::type`

The first parameter of a `ComputedField` is its type, which is a `SchemaField`, since it is destined to be merged within a `Schema`.
The type represents the format of the value which will be returned by the `resolve` function. It is the only mandatory field.

#### `ComputedField::args`

The `args` parameter allows to define arguments for the GraphQL field. As GraphQL arguments are named, the `args` field is a `Schema`,
a named map of `SchemaField`s.

#### `ComputedField::mode`

The `mode` field is there to customize the way the computed field will be used. By default it is set to `[PropertyMode.OUTPUT]`, meaning
that the field only shows up in the GraphQL output type of the schema. It can also be set to `[PropertyMode.INPUT]` in order to appear
only in the GraphQL input type, or `[PropertyMode.INPUT, PropertyMode.OUTPUT]` to be available in both. Setting it to an empty array will result
in the value being ignored, thus treated as `[PropertyMode.OUTPUT]`.

#### `ComputedField::scopes`

The `scopes` field allows to set `Scope` functions for our given computed field. The functions are set as an array, and will
be executed in order, each scope function receiving as `args` the result of the previous one.

When using TypeScript and the definitely typed `ComputedField`, the `args` parameter passed to the scope functions as well as their
return type are typed from the `args` field of the computed field.

For more information about `Scope` functions, see [`Scope`](#scope).

#### `ComputedField::transforms`

The `transforms` field allows to set `Transform` functions for our given computed field. The functions are set as an array, and will
be executed in order, each transform function receiving as `value` the result of the previous one.

When using TypeScript and the definitely typed `ComputedField`, the `args` parameter passed to the transform functions is typed
from the `args` field of the computed field, and the `value` parameter as well as their return type are typed from the `type` field of the computed field.

For more information about `Transform` functions, see [`Transform`](#transform).

#### `ComputedField::resolve`

Finally, the `resolve` field is a function describing how to get the value for the given field. This function is async, meaning
that the value of the field can be the result of asynchronous operations such as database accesses.

When using TypeScript and the definitely typed `ComputedField`, the `args` parameter passed to the resolve function is typed
from the `args` field of the computed field, and the return type is typed from the `type` field of the computed field.

<br />

---

### `ComputedQuery`

The `ComputedQuery` types describes a special field that instead of being added to a schema, will be added
to the GraphQL root's Query ou Mutation objects.

As for `ComputedField`, its TypeScript definition is a bit convoluted in order to be definitely typed from the various `Schema`s it takes into account:
the query's arguments, its type, the `Schema` it belongs to... However the final type is actually very straightforward.

Here is the definition of the definitely typed `ComputedQuery`:

```ts
type TypedComputedQuery<
  Context extends any,
  Schemas extends { [key: string]: Schema },
  CurrentSchema extends Schema,
  Extension extends CrudEnum,
  Args extends Schema,
  Return extends SchemaField,
  > = (
  { extends: Extension, type?: Return, args?: never } |
  { extends: Extension, type?: never, args?: Args } |
  { extends?: never, type: Return, args?: Args }
)
  & {
  scopes?: Scope<
    Context,
    Schemas,
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>>[]
  transforms?: Transform<
    Context,
    Schemas,
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    undefined extends Return
    ? ExtendedType<Extension, CurrentSchema>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>>[]

  resolve: Resolver<
    // Source
    any,
    // Args
    undefined extends Args
    ? ExtendedArgs<Extension, CurrentSchema>
    : SchemaInputType<NonNullable<Args>>,
    // Return
    undefined extends Return
    ? ExtendedType<Extension, CurrentSchema>
    : Return extends Schema ? SchemaOutputType<Return> | null : PropertyOutputType<NonNullable<Return>>,
    Context,
    Schemas>
}

export type ComputedQuery<Context extends any = any,
  Schemas extends { [key: string]: Schema } = any,
  CurrentSchema extends Schema = any,
> =
  TypedComputedQuery<Context, Schemas, CurrentSchema, CrudEnum, any, any>
```

As for `ComputedField` and the sake of readability, here is the _non-generic_, _union-separated_ version of `ComputedQuery`:

```ts
type ComputedQuery = {
  extends: CrudEnum
  args?: Schema

  scopes: Scope[]
  transforms: Transform[]

  resolve: Resolver
}

// Or

type ComputedQuery = {
  type: SchemaField
  args?: Schema

  scopes: Scope[]
  transforms: Transform[]

  resolve: Resolver
}

// Or

type ComputedQuery = {
  extends: CrudEnum
  type: SchemaField

  scopes: Scope[]
  transforms: Transform[]

  resolve: Resolver
}
```
> Jump to:
[`Schema`](#schema),
[`SchemaField`](#schema),
[`CrudEnum`](#crudenum),
[`Scope`](#scope),
[`Transform`](#transform),
[`Resolver`](#resolver)

`ComputedQuery` accepts various combination of `extends`/`type`/`args`, which can be summarized by:
 - There should be at least `type` or `extends`
 - `args` is always optional
 - There can not be the three fields set at the same time

#### `ComputedQuery::extends`

This first field allows to create an _extended_ Query or Mutation field. This means that this Query (or Mutation) inherits
its type and arguments from one of the default CRUD operations generated by HarmonyJS.
For instance, if `extends` is set to `create`, then the arguments will have a unique field named `record` of the
input type of the schema, and the return type will be the output type of the schema.

It is also possible to define either the `args` or `type` field alongside the `extends` field, to tell HarmonyJS to use
a custom value instead of the extended one. If both `args` and `type` are provided alongside `extends`, the `extends` value
is ignored. However the TypeScript compiler won't accept such a combination in order to avoid unintentional behavior.

#### `ComputedQuery::type`

When provided, this defines the GraphQL output type of the defined query or mutation.

#### `ComputedQuery::args`

When provided, this defines the GraphQL input type of the defined query or mutation's arguments.

#### `ComputedQuery::scopes`

The `scopes` field allows to set `Scope` functions for our given query or mutation. The functions are set as an array, and will
be executed in order, each scope function receiving as `args` the result of the previous one.

When using TypeScript and the definitely typed `ComputedQuery`, the `args` parameter passed to the scope functions as well as their
return type are typed from the `args` field of the query or mutation.

For more information about `Scope` functions, see [`Scope`](#scope).

#### `ComputedQuery::transforms`

The `transforms` field allows to set `Transform` functions for our given query or mutation. The functions are set as an array, and will
be executed in order, each transform function receiving as `value` the result of the previous one.

When using TypeScript and the definitely typed `ComputedQuery`, the `args` parameter passed to the transform functions is typed
from the `args` field of the query or mutation (or computed from its `extends` fields if `args` is not provided),
 and the `value` parameter as well as their return type are typed from the `type` field of the query or mutation.

For more information about `Transform` functions, see [`Transform`](#transform).

#### `ComputedQuery::resolve`

Finally, the `resolve` field is a function describing what happens when the given query or mutation is called.
This function is async, meaning that the value returned by the query or mutation can be the result of asynchronous
operations such as database accesses.

When using TypeScript and the definitely typed `ComputedQuery`, the `args` parameter passed to the resolve function is typed
from the `args` field of the query or mutation, and the return type is typed from the `type` schema of the query or mutation.

<br />

---

### `ExtendedArgs`

The `ExtendedArgs` internal type is used to definitely type `ComputedQuery` queries using the `extends` field. Depending
on the `extends` keyword selected, the `args` typing for the `Resolver`, `Scope` and `Transform` functions is extracted
using this helper type.

```typescript
type FilterArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema> & {
  _and?: FilterArgs<CurrentSchema>[]
  _or?: FilterArgs<CurrentSchema>[]
  _nor?: FilterArgs<CurrentSchema>[]
  _operators?: SchemaOperatorType<CurrentSchema>
} & (
  unknown extends CurrentSchema['_id'] ? { _id?: string } : {}
)>

type RecordArgs<CurrentSchema extends Schema> = Partial<SchemaInputType<CurrentSchema>> & (
  unknown extends CurrentSchema['_id'] ? { _id: string } : {}
)

type ExtendedArgs<
  Extension extends AliasCrudEnum,
  CurrentSchema extends Schema
> = (
  CrudEnum extends Extension ? any :
  'count' extends Extension ? { filter?: FilterArgs<CurrentSchema> } :
  'read' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'get' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'find' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number } :
  'readMany' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number, limit?: number } :
  'list' extends Extension ? { filter?: FilterArgs<CurrentSchema>, skip?: number, limit?: number } :

  'create' extends Extension ? { record: Partial<RecordArgs<CurrentSchema>> } :
  'createMany' extends Extension ? { records: Partial<RecordArgs<CurrentSchema>[]> } :
  'update' extends Extension ? { record: RecordArgs<CurrentSchema> } :
  'updateMany' extends Extension ? { records: RecordArgs<CurrentSchema>[] } :
  'edit' extends Extension ? { record: RecordArgs<CurrentSchema> } :
  'editMany' extends Extension ? { records: RecordArgs<CurrentSchema>[] } :
  'delete' extends Extension ? { _id: string } :
  'deleteMany' extends Extension ? { _ids: string[] } :
  any
)
```
> Jump to:
[`AliasCrudEnum`](#crudenum),
[`CrudEnum`](#crudenum),
[`Schema`](#schema)
[`SchemaInputType`](#schemainputtype)

<br />

---

### `ExtendedType`

The `ExtendedType` internal type is used to definitely type `ComputedQuery` queries using the `extends` field. Depending
on the `extends` keyword selected, the `type` typing for the `Resolver`, `Scope` and `Transform` functions is extracted
using this helper type.

```typescript
type OutputType<CurrentSchema extends Schema> = SchemaOutputType<CurrentSchema> & (
  unknown extends CurrentSchema['_id'] ? { _id: string } : {}
)

type ExtendedType<
  Extension extends AliasCrudEnum,
  CurrentSchema extends Schema
  > = (
  CrudEnum extends Extension ? any :
  'count' extends Extension ? number :
  'read' extends Extension ? OutputType<CurrentSchema>|null :
  'get' extends Extension ? OutputType<CurrentSchema>|null :
  'find' extends Extension ? OutputType<CurrentSchema>|null :
  'readMany' extends Extension ? OutputType<CurrentSchema>[] :
  'list' extends Extension ? OutputType<CurrentSchema>[] :

  'create' extends Extension ? OutputType<CurrentSchema>|null :
  'createMany' extends Extension ? OutputType<CurrentSchema>[] :
  'update' extends Extension ? OutputType<CurrentSchema>|null :
  'updateMany' extends Extension ? OutputType<CurrentSchema>[] :
  'edit' extends Extension ? OutputType<CurrentSchema>|null :
  'editMany' extends Extension ? OutputType<CurrentSchema>[] :
  'delete' extends Extension ? OutputType<CurrentSchema>|null :
  'deleteMany' extends Extension ? OutputType<CurrentSchema>[] :
  any
)
```
> Jump to:
[`AliasCrudEnum`](#crudenum),
[`CrudEnum`](#crudenum),
[`Schema`](#schema)
[`SchemaOutputType`](#schemaoutputtype)

<br />

---

### `CrudEnum`

```ts
type CrudEnum = 'read'|'readMany'|'count'|'create'|'createMany'|'update'|'updateMany'|'delete'|'deleteMany'
type AliasCrudEnum = CrudEnum|'get'|'list'|'edit'|'editMany'
```

`CrudEnum` contains the list of all default CRUD resolvers exposed by HarmonyJS. `AliasCrudEnum` is the same list
extended with a few aliases for some CRUD actions.

- `read` (aliased `get`): retrieve one document based on a given filter, with optional skip parameter
- `readMany` (aliased `list`): retrieve an array of document based on a given filter, with optional pagination and sorting
- `count`: count documents based on a given filter
- `create`: create a new document entry
- `createMany`: create a bunch of documents in one query
- `update` (aliased `edit`): update a document based on its ID
- `updateMany` (aliased `editMany`): update an array of documents based on their IDs
- `delete`: delete a document based on its ID
- `deleteMany`: delete an array of documents based on their IDs
