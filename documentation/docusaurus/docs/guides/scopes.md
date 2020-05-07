---
title: Securing and scoping the API
sidebar_label: Tutorial - Securing and scoping the API
---

If you've played a bit with the Playground by now, you might have detected one big
security caveat: all CRUD functions are available publicly for each model, and have
no notion of users to filter out which data to return.

HarmonyJS answers both these problems with [`Scope`s](/docs/api/persistence#scope).

A `Scope` is a simple function that we can add before a `resolver`, which will allow us
to catch and even alter the arguments passed to queries before running the actual
`resolve` function - or even deciding not to run it altogether. It can be added both to
custom fields and to auto-generated CRUD queries.

:::note
This section has quite a bit of code. Some of it could be refactored in order to reuse common logic. 
It was purposely left really verbose for readability and completeness sake, and to avoid creating new
files. 

At the end of this section, you should have a new `scopes.js` file in each subfolders of your `models`
folder, and the `index.js` file of all your models should be edited to use those scopes.
:::

## Step 1 - Activating strict mode

In order to simplify the development of secure API, HarmonyJS Persistence can be run in
`strict` mode - in fact, it is recommended for any production application to always run
in `strict` mode.

Enabling this mode is as simple as passing `strict: true` to Persistence's initialization:

```js title="index.js" {2}
  await persistence.initialize({
    strict: true,
    models: {
      User,
      List,
      Todo,
      Comment,
    },
    log: {
      console: true,
    }
  })
```

Relaunching the server, you should now see in the Playground that all our CRUD queries
have disappeared!

This is intended, and we will now see how we can re-enable them one-by-one securely.

## Step 2 - Adding scopes to our `User` model

In order to add scopes to the basic CRUD functions, we need to add them at the model level.
Once again, edit the User's `index.js` as follows:

```js title="models/user/index.js" {3,8}
import schema from './schema'
import computed from './computed'
import scopes from './scopes'

export default {
  schema,
  computed,
  scopes,
}
```

And create the newly-needed `models/user/scopes.js` file with the following content:

```js title="models/user/scopes.js
import { HttpErrors } from '@harmonyjs/server'

export default {
  // Queries
  async read({ args, context: { authentication } }) {
    const nextArgs = { ...args }

    const connected = authentication.get()

    // If we are not connected, we cannot read a user's info
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to read a user')
    }

    // Else, force filtering to target the connected user
    nextArgs.filter = nextArgs.filter || {}
    nextArgs.filter._id = connected.user

    return nextArgs
  },

  // Mutations
  async create({ context: { authentication } }) {
    const connected = authentication.get()

    // If we are already connected, we cannot create a new user
    if(connected && connected.user) {
      throw HttpErrors.Unauthorized('An authenticated user cannot create a new user')
    }
  }
}
```

:::note
Scope functions, just like custom resolvers, are not called when mocking the schema, and 
therefore need a real database to be tested.
:::

Our first `Scope` function targets the `read` CRUD operation for the `User` model. It checks if
an authentication token was found and if it contains a user ID. If it does, it modifies the filter
argument to force filtering by this ID - if it does not, it throws an exception.

Our second `Scope` function targets the `create` CRUD operation, but this times checks the opposite:
we need to be logged out to be able to sign-up.

Relaunching the app at this point, the `user` query and `userCreate` mutation will be back in the Playground.

In `strict` mode, only CRUD operation with a corresponding `scope` function will be available in
the GraphQL schema.


## Step 3 - Updating our `userLogin` query

We've now modified the `read` operation for User, making it mandatory to be logged-in before accessing
a User's info. This in turns makes our `userLogin` query fail, since it relies on the `read` query to
find a user by its email. However, the `Scope` functions are called both for GraphQL _and_ internal
access, making our query fail with a `Unauthorized` exception.

Fortunately, HarmonyJS allows us to bypass the `Scope` step when calling a resolver from inside the server,
using the `unscoped` variant of our CRUD operations. In `models/user/computed.js`:

```js title="models/user/computed.js" {14}
import { Types } from '@harmonyjs/persistence'

export default {
  fields: {},
  queries: {
    userLogin: {
      type: Types.String,
      args: {
        email: Types.String.required,
        password: Types.String.required,
      },
      async resolve({ args: { email, password }, resolvers: { User }, context: { authentication } }) {
        // Fetch the user by its email
        const user = await User.read.unscoped({
          filter: {
            email,
          },
        })
```

## Step 4 - Adding scopes to `List`

In the case of `List`, we need the following actions and scopes:

 * I can fetch a list of `List` when I'm authenticated. This list is limited to my own lists and lists
 shared with me.
 * I can read a `List` when I'm authenticated. I'm limited to my own lists and lists shared with me.
 * I can create a `List`.
 * I can update a `List` if I'm its owner.
 * I can delete a `List` if I'm its owner.
 
In terms of `Scope`s, this is how we would express those rules. This a bit more code than previously shown, 
but it still pretty straightforward to understand:
 
```js title="models/list/scopes.js"
import { HttpErrors } from '@harmonyjs/server'

// Helper function shared by the read and readMany scopes
const visibleListFilter = (args, connected) => {
  const nextArgs = { ...args }

  // Else, force filtering to target the connected user
  nextArgs.filter = nextArgs.filter || {}
  nextArgs.filter._and = nextArgs.filter._and || []

  // We add our `or` condition to a new `and` condition to avoid the risk of the `or` array
  // being polluted maliciously
  nextArgs.filter._and.push({
    _or: [
      // Either I'm the owner
      { owner: connected.user },
      // Or the list was shared with me (at least one value of "sharedTo" is me)
      { _operators: { sharedTo: { some: { eq: connected.user } } } }
    ]
  })

  return nextArgs
}

export default {
  // Queries

  // I can read a `List` when I'm authenticated. I'm limited to my own lists and lists shared with me.
  async read({ args, context: { authentication} }) {
    const connected = authentication.get()

    // If we are not connected, we cannot read a list's info
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to read a list')
    }

    return visibleListFilter(args, connected)
  },
  //  I can fetch a list of `List` when I'm authenticated. This list is limited to my own lists and lists shared with me
  async readMany({ args, context: { authentication } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot list lists
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to list lists')
    }

    return visibleListFilter(args, connected)
  },

  // Mutations

  // I can create a `List`
  async create({ args, context: { authentication } }) {
    const nextArgs = { ...args }

    const connected = authentication.get()

    // If we are not connected, we cannot create a list
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to create a list')
    }

    // If we are connected, we are the owner of the created list
    nextArgs.record = nextArgs.record || {}
    nextArgs.record.owner = connected.user
  },
  // I can update a `List` if I'm its owner
  async update({ args, context: { authentication }, resolvers: { List } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot delete a list
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to update a list')
    }

    // Fetch the list
    const list = await List.read({ _id: args.record._id, owner: connected.user })

    if(!list || list.owner !== connected.user) {
      throw HttpErrors.Unauthorized('You are not the owner of that list')
    }
  },
  // I can delete a `List` if I'm its owner
  async delete({ args, context: { authentication }, resolvers: { List } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot delete a list
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to delete a list')
    }

    // Fetch the list
    const list = await List.read({ _id: args.record._id, owner: connected.user })

    if(!list || list.owner !== connected.user) {
      throw HttpErrors.Unauthorized('You are not the owner of that list')
    }
  }
} 
```

Don't forget to edit your `models/list/index.js` to inject your new scopes:

```js title="models/list/index.js" {2,6}
import schema from './schema'
import scopes from './scopes'

export default {
  schema,
  scopes,
}
```


## Step 5 - Adding scopes to `Todo`

Since todos are always part of a `List`, we actually don't need read functions directly for the
`Todo` model. The only operations we need are create and update/delete, for which we will simply check
the access rights to the `List`.

Here are our scopes:

```js title="models/todo/scopes.js"
import { HttpErrors } from '@harmonyjs/server'

const todoEditScope = async ({ args, context: { authentication }, resolvers: { List } }) => {
  const connected = authentication.get()

  // If we are not connected, we cannot create a todo
  if(!connected || !connected.user) {
    throw HttpErrors.Unauthorized('You need to be authenticated to create or update a todo')
  }

  // Without a list, we cannot create a todo
  if(!args.record || !args.record.list) {
    throw HttpErrors.BadRequest('A list is needed to create or update a todo')
  }

  // Fetch the list
  const list = await List.read({
    filter: {
      _id: args.record.list,
      _or: [
        // Either I'm the owner
        { owner: connected.user },
        // Or the list was shared with me (at least one value of "sharedTo" is me)
        { _operators: { sharedTo: { some: { eq: connected.user } } } }
      ]
    }
  })

  if(!list) {
    throw HttpErrors.Unauthorized('You don\'t have access to this list')
  }
}

export default {
  // Mutations
  create: todoEditScope,
  update: todoEditScope,
  async delete({ args, context: { authentication }, resolvers: { List, Todo } }) {
    const connected = authentication.get()
  
    // If we are not connected, we cannot delete a todo
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to delete a todo')
    }

    // Fetch the todo
    const todo = Todo.read({ filter: { _id: args._id } })

    // Fetch the list
    const list = await List.read({
      filter: {
        _id: todo.list,
        _and: [
          // Either I'm the owner
          { owner: connected.user },
          // Or the list was shared with me (at least one value of "sharedTo" is me)
          { _operators: { sharedTo: { some: { eq: connected.user } } } }
        ]
      }
    })
  
    if(!list) {
      throw HttpErrors.Unauthorized('You don\'t have access to this todo\'s list')
    }
  },
}
```

Don't forget to edit your `models/todo/index.js` to inject your new scopes:

```js title="models/todo/index.js" {2,6}
import schema from './schema'
import scopes from './scopes'

export default {
  schema,
  scopes,
}
```

## Step 6 - Adding scopes to `Comment`

Finally, we need to scope our comments. For comments, we need four things:

* I can list comments for a todo I have access to
* I can create comments on todos I have access to
* I can update comments I created
* I can delete comments I created

Our scopes will look as follows:

```js title="models/comment/scopes.js
import { HttpErrors } from '@harmonyjs/server'

export default {
  // Queries
  async readMany({ args, context: { authentication }, resolvers: { Todo, List } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot list comments
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to list comments')
    }

    // Without a todo, we cannot list comments
    if(!args.filter || !args.filter.todo) {
      throw HttpErrors.BadRequest('A todo is needed to list comments')
    }

    // Fetch the todo
    const todo = Todo.read({ filter: { _id: args.filter.todo } })

    // Fetch the list
    const list = await List.read({
      filter: {
        _id: todo.list,
        _and: [
          // Either I'm the owner
          { owner: connected.user },
          // Or the list was shared with me (at least one value of "sharedTo" is me)
          { _operators: { sharedTo: { some: { eq: connected.user } } } }
        ]
      }
    })

    if(!list) {
      throw HttpErrors.Unauthorized('You don\'t have access to this todo')
    }
  },

  // Mutations
  async create({ args, context: { authentication }, resolvers: { Todo, List } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot create a comment
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to create a comment')
    }

    // Without a todo, we cannot create a comment
    if(!args.record || !args.record.todo) {
      throw HttpErrors.BadRequest('A todo is needed to create a comment')
    }

    // Fetch the todo
    const todo = Todo.read({ filter: { _id: args.record.todo } })

    // Fetch the list
    const list = await List.read({
      filter: {
        _id: todo.list,
        _and: [
          // Either I'm the owner
          { owner: connected.user },
          // Or the list was shared with me (at least one value of "sharedTo" is me)
          { _operators: { sharedTo: { some: { eq: connected.user } } } }
        ]
      }
    })

    if(!list) {
      throw HttpErrors.Unauthorized('You don\'t have access to this todo')
    }
  },
  async update({ args, context: { authentication }, resolvers: { Comment } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot update a comment
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to update a comment')
    }

    // Fetch the comment
    const comment = Comment.read({
      _id: args.record._id,
      author: connected.user,
    })

    if(!comment || comment.author !== connected.user) {
      throw HttpErrors.Unauthorized('You are not the author of that comment')
    }
  },
  async delete({ args, context: { authentication }, resolvers: { Comment } }) {
    const connected = authentication.get()

    // If we are not connected, we cannot delete a comment
    if(!connected || !connected.user) {
      throw HttpErrors.Unauthorized('You need to be authenticated to delete a comment')
    }

    // Fetch the comment
    const comment = Comment.read({
      _id: args._id,
      author: connected.user,
    })

    if(!comment || comment.author !== connected.user) {
      throw HttpErrors.Unauthorized('You are not the author of that comment')
    }
  }
}
```

Don't forget to edit your `models/comment/index.js` to inject your new scopes:

```js title="models/comment/index.js" {2,6}
import schema from './schema'
import scopes from './scopes'

export default {
  schema,
  scopes,
}
```

## Going further

We've now made our API secured by exposing only the needed operations, and scoping those behind
an authentication layer with user-based access rights.

We are now ready to connect our server to our MongoDb database.
