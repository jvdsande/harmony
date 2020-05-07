---
title: Adding computed fields
sidebar_label: Tutorial - Adding computed fields
---

While schemas are a great way to define our model, sometimes we want just a bit more power
to describe our models. Let's imagine a model with a first-name and a last-name, for instance.
Wouldn't it be great to have access to a full-name property, which value changes automatically
with the two first?

This is where `computed` fields come into play. `computed` fields are fields added to the
schema but that aren't saved in the database. Instead, they are dynamically built (_computed_)
each time they are asked for.

Their build function is yet another GraphQL resolver, which opens up a bunch of possibility:
 - This resolver gets as argument the value stored in database, meaning that it can create combination
 of any of those values
 - As all resolvers, it is an _asynchronous_ function, so any data can be fetched to build
 our new computed field
 - It receives the `resolvers` map like query resolvers, meaning it has access to all our other
 models
 

Without further ado, let's look at a bunch of computed fields we could add.

## Step 1 - Make sure `todo.status` is always defined

Our `Todo` schema has a `status` boolean field, which can be undefined when our todo has
not yet been initialized.

Using a computed field, we will be able to force its value to be either `false` or `true`. 

Simply create a `models/todo/computed.js` file filled with the following:
 
```js title="models/todo/computed.js"
import { Types } from '@harmonyjs/persistence'

export default {
  fields: {
    status: {
      type: Types.Boolean,
      async resolve({ source }) {
        if(source.status) {
          return true
        }

        return false
      },
    },
  },
}
```

As usual, don't forget to inject the computed fields into your model:

```js title="models/todo/index.js {2,7}
import schema from './schema'
import computed from './computed'
import scopes from './scopes'

export default {
  schema,
  computed,
  scopes,
}
```

## Step 2 - List todos directly from inside a `List`

For now in our model, the one-to-many link between `List` and `Todo` lies only in the `Todo` element.

However, and since our entry-point for the client will most likely be `List`, it would be
really helpful to get the todos of a `List`... Directly in its schema.

This can be done by creating a `computed` field in the `List` schema, fetching all the todos
whose `list` field is equal to our `List`'s `_id`.

In fact, that is such a common need that HarmonyJS has a special type made just for that: `ReversedReference`.

Using this type on a `computed` field, it is not necessary to implement the `resolve` function ourselves:
the framework will take care of it.

This is what our `models/list/computed.js` file should look like:

```js title="models/list/computed.js"
import {Types} from '@harmonyjs/persistence'

export default {
  fields: {
    todos: {
      type: [Types.ReversedReference.of('Todo').on('list')],
    },
  },
}
```

And just like that, we now have a `todos` field on each of our `List` element, actively fetching the
corresponding todos every time it's requested.

We used here an _array_ of `ReversedReference` to allow for a one-to-many relationship.

As usual, don't forget to inject the computed fields into your model:

```js title="models/list/index.js {2,7}
import schema from './schema'
import computed from './computed'
import scopes from './scopes'

export default {
  schema,
  computed,
  scopes,
}
```

## Step 3 - Add todo statistics

This next modification will help us easily improve our UI. It's again some `computed` fields
to add to our `List` schema. However this time, we will make them into a _nested_ field, to see some
advanced resolver patterns.

The naive implementation would be something like this:

```js
  info: {
    type: {
      nbTotal: Types.Number,
      nbPending: Types.Number,
      nbDone: Types.Number,
    },
    async resolve({ source, resolvers: { Todo } }) {
      const nbTotalPromise = Todo.count({ filter: { list: source._id } })
      const nbPendingPromise = Todo.count({ filter: { list: source._id, _operators: { status: { ne: true } } } })
      const nbDonePromise = Todo.count({ filter: { list: source._id, status: true } })
      
      const [nbTotal, nbPending, nbDone] = await Promise.all([nbTotalPromise, nbPendingPromise, nbDonePromise])

      return ({
        nbTotal,
        nbPending,
        nbDone,
      })
    },
  },
```

While the above works, it is unnecessarily expensive. Indeed, we will be running the three promises even
if only one of the fields was requested by the client!

It would be much better to keep each promise in its own resolver. However, for nested fields,
this is not as easy as for root fields.

In order to achieve this, we need to use the fourth field of the [`Computed`](/docs/api/persistence#computed)
object: `custom`. This fields allows to specify `resolvers` for _any_ field in the schema, provided we know
its full name, and it contains nested fields.

In our case, we want to resolve nested fields for the `list.info` field, which in GraphQL (this can be checked
from the Playground) will be known as the `ListInfo` type.


**Creating the default resolver**

The first step is to create the resolver in the `fields` field as usual, but this time we won't compute
the value. Instead, we'll simply forward the `source` arguments downstream:


```js title="models/list/computed.js {8-18}
import {Types} from '@harmonyjs/persistence'

export default {
  fields: {
    todos: {
      type: [Types.ReversedReference.of('Todo').on('list')],
    },
    info: {
      type: {
        nbTotal: Types.Number,
        nbPending: Types.Number,
        nbDone: Types.Number,
      },
      async resolve({ source }) {
        // Simply forward source for now
        return source
      },
    },
  },
}

```

**Adding the custom resolvers**

Then, we can add our three custom resolvers in the `custom` section. First, the `nbTotal` resolver:

```js title="models/list/computed.js {20-26}
import {Types} from '@harmonyjs/persistence'

export default {
  fields: {
    todos: {
      type: [Types.ReversedReference.of('Todo').on('list')],
    },
    info: {
      type: {
        nbTotal: Types.Number,
        nbPending: Types.Number,
        nbDone: Types.Number,
      },
      async resolve({ source }) {
        // Simply forward source for now
        return source
      },
    },
  },
  custom: {
    ListInfo: {
      nbTotal: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id } })
      },
    },
  },
}
```

Then the `nbPending`'s:

```js {6-8}
  custom: {
    ListInfo: {
      nbTotal: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id } })
      },
      nbPending: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id, _operators: { status: { ne: true } } } })
      },
    },
  },
```

And finally the `nbDone`'s:

```js {9-11}
  custom: {
    ListInfo: {
      nbTotal: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id } })
      },
      nbPending: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id, _operators: { status: { ne: true } } } })
      },
      nbDone: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id, status: true } })
      },
    },
  },
```

And here we have it: our three resolvers each correctly separated, meaning each query will
only be ran if the field has been requested by the client.

## Step 4 - Share list query

Sharing a list can be done using a user's email address. However we face two issues:
 - The link between `List` and `User` is done using an ID, not an email
 - We've secured the API so that it is not possible to fetch another user than ourselves.
 
Fortunately, both those limitations do not apply on the server-side. This means we can
create a new query, or more specifically a mutation, to handle the sharing of `List`.

This mutation will receive two arguments: a `List`'s `_id` to share, and an email to
share the `List` to. We'll start by fetching the user, throwing an error if it cannot be found,
and updating the `List` with the fetched user's ID.

Here is our mutation implemented:

```js title="models/list/computed.js" {2,31-67}
import { Types } from '@harmonyjs/persistence'
import { HttpErrors } from '@harmonyjs/server'

export default {
  fields: {
    todos: {
      type: [Types.ReversedReference.of('Todo').on('list')],
    },
    info: {
      type: {
        nbTotal: Types.Number,
        nbPending: Types.Number,
        nbDone: Types.Number,
      },
      async resolve({ source }) {
        // Simply forward source for now
        return source
      },
    },
  },
  custom: {
    ListInfo: {
      nbTotal: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id } })
      },
      nbPending: async ({ source, resolvers: { Todo } }) => {
        return Todo.count({ filter: { list: source._id, _operators: { status: { ne: true } } } })
      },
    },
  },

  mutations: {
    listShare: {
      type: Types.Reference.of('List'),
      args: {
        list: Types.ID,
        email: Types.String,
      },
      async resolve({ args, context: { authentication }, resolvers: { User, List } }) {
        const user = await User.read.unscoped({
          filter: {
            email: args.email,
          },
        })

        if(!user) {
          throw HttpErrors.BadRequest('No user with the given email')
        }

        const list = await List.read.unscoped({
          filter: {
            _id: args.list,
          },
        })

        if(!list.sharedTo.includes(user._id)) {
          list.sharedTo.push(user._id)
        }

        return List.update({
          record: {
            _id: list._id,
            sharedTo: list.sharedTo,
          }
        })
      },
    },
  },
}
```

## Next steps

This concludes the server-side of our tutorial. We now have our finished API!

The next steps will guide you towards building the client - a React application that will 
consume this API to create a beautiful todo-list application!
