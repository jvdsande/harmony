---
title: Adding an authentication service
sidebar_label: Tutorial - Adding an authentication service
---

If you've followed the previous two guides, you should have at this point:

 * A working NodeJS application serving a server on port 3000 through `@harmonyjs/server`
 * A complete modeling of our todo application, compiled into a GraphQL schema by `@harmonyjs/persistence`

In this section, we will update our server-side code by adding an authentication service.
 
## Step 1 - Adding an authentication controller

In order to add authentication, we will need to add a new controller to our `Server` instance.

Right now, we've only added one controller: the `ControllerGraphQL` provided by `Persistence`.
Here, we will be adding a brand-new controller, installed from its own package: `ControllerAuthenticationJWT`.

This controller configures an authentication layer for the server instance using JSON Web Tokens.


:::note
We could also have achieved our authentication using `ControllerAuthenticationSession`. JWT-based authentication
was chosen for this guide in order to showcase usage of advanced options on the client side.
:::

Go ahead and install the controller's package:

```shell script
npm install @harmonyjs/controller-auth-jwt
```

In order to use this controller, we need to modify two things in `index.js`: first, we need to import
the controller and add it to our server's controllers list, then we need to tell Persistence
that this is the authentication controller we've chosen to use, in order for Persistence
to expose the correct API to the GraphQL world.

Here are the various modifications applied:

```js title="index.js" {4,21-25,29}
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import ControllerAuthenticationJWT from '@harmonyjs/controller-auth-jwt'

import User from './models/user'
import List from './models/list'
import Todo from './models/todo'
import Comment from './models/comment'

async function run() {
  const persistence = new Persistence()
  const server = Server()

  await persistence.initialize({
    ...
  })

  await server.initialize({
    controllers: [
      ControllerAuthenticationJWT({
        // For a production website, this secret should be loaded 
        // from an environment variable and not be hard-coded!
        secret: 'my-todolist-jwt-secret',
      }),
      persistence.controllers.ControllerGraphQL({
        path: '/',
        enablePlayground: true,
        authentication: ControllerAuthenticationJWT,
      }),
    ],
    log: {
      console: true,
    },
  })
}

run()
```

And at our next application startup, the following log should appear:

```shell script {12}
20/05/05 19:55:56.096 Server           [INFO   ] Powered by
   _    _
  | |  | |
  | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
  |  __  |/ _` | '__| '_ ` _ \ / _ \| '_ \| | | |
  | |  | | (_| | |  | | | | | | (_) | | | | |_| |
  |_|  |_|\__,_|_|  |_| |_| |_|\___/|_| |_|\__, |
                                            __/ |
                                           |___/
20/05/05 19:55:56.096 Server           [INFO   ] Initializing Fastify Server
20/05/05 19:55:56.100 Server           [INFO   ] Initializing Socket.IO layer
20/05/05 19:55:56.113 ControllerAuthenticationJWT [INFO   ] Authentication system initialized
20/05/05 19:55:56.114 ControllerGraphQL           [INFO   ] Registering GraphQL endpoint...
20/05/05 19:55:56.199 ControllerGraphQL           [INFO   ] GraphQL endpoint at /
20/05/05 19:55:56.200 ControllerGraphQL           [INFO   ] GraphQL playground at /
20/05/05 19:55:56.227 Server                      [INFO   ] Main server created on port localhost:3000
```

We can now build our authentication logic, using the provided authentication controller and its
API injected to the GraphQL world.

## Step 2 - Adding a `userLogin` query

Since we now have our authentication controller ready, we can develop a query for logging-in a
user: the `userLogin` query. This will be our first custom query, and it opens up a whole world
of opportunities.

Creating a custom query in Harmony is pretty straightforward. Custom queries and mutations 
are part of the _computed fields_ category. Each model can implement such computed fields - and so
each model can have its custom queries and mutations.

To add computed fields to a model, simply edit its `index.js` file as follows:

```js title="models/user/index.js" {2,6}
import schema from './schema'
import computed from './computed'

export default {
  schema,
  computed,
}
```

And create a new `models/user/computed.js` file with the following content:

```js title="models/user/computed.js"
import { Types } from '@harmonyjs/persistence'

export default {
  fields: {},
  queries: {},
  mutations: {},
}
```

The exported objects contains three subfields:
 * `fields` is aimed at extending the model's schema with new computed fields, only available at runtime (as in, not stored in the database).
 * `queries` will hold the model's custom GraphQL queries
 * and `mutations` will hold the custom GraphQL mutations
 
In our case, we are interested in a `userLogin` query. This query takes an email and password in
arguments, and returns a string: the encoded JWT used for authentication.

It will look as follows:

```js title="models/user/computed.js {6-15}
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
      async resolve() {
        return null // Todo: create a JSON Web Token
      },
    },
  },
  mutations: {},
}
```

This implementation is however missing a key part: the `resolve` function!

This function is where all the logic takes place. It receives a bunch of parameters, including
the arguments from the query, but also an access to the _GraphQL context_, which will give us access
to the authentication API, as well as _model resolvers_, which allows us to retrieve our data
from inside the server.

For implementing the login query, we will need all those things: the User resolver to check
for the authenticating user, the context to create the token, and of course the arguments.

Here is a sample implementation:

```js
async resolve({ args: { email, password }, resolvers: { User }, context: { authentication } }) {
  // Fetch the user by its email
  const user = await User.read({
    filter: {
      email,
    },
  })

  // If we didn't find the user, return null
  if(!user) {
    return null
  }
  
  // Here we "hash" the password using the base64 encoding functions from Node
  // Do not do that in production! Use a real hashing algorithm
  const hashedPassword = Buffer.from(password).toString('base64')
  
  // If the stored password matches the argument, return the created JWT
  if(hashedPassword === user.password) {
    return authentication.create({ user: user._id })
  }
  
  // Else, return null
  return null
}
```

There are a few key HarmonyJS concepts in this implementation:

* **Usage of model resolvers**: All the basic CRUD resolvers generated for each model (as
seen in the Playground) are accessible in code _via_ the `resolvers` arguments passed
to custom `resolve` functions. 

 The `resolvers` object is a map with the _exact same names_ as the `models` map passed
to the `Persistence::initialize` function. In our case, it will feature four entries: 
`User`, `List`, `Todo` and `Comment`. 

 Each of these entries provide access to the 7 basic CRUD functions from Harmony: `read`, `readMany`,
`count`, `create`, `createMany`, `update`, `updateMany`, `delete` and `deleteMany`.

 The CRUD functions take the exact same parameters as their GraphQL counterparts. In our case, we
use the `read` function using the `filter` parameter to search for a user by its email.

* **Usage of context**: Each custom `resolve` function receives a `context` argument,
which exposes a few common utilities.
 
 Here, since we've added an authentication layer through the `ControllerAuthenticationJWT` controller,
we gain access to the `authentication` utility, which exposes two straightforward methods:
`create`, as used here, which produces a new signed JSON Web Token, and `get` which we
will take advantage of later, which retrieves the content of the token if present in
the headers.

## Step 3 - Creating a custom `userCreate` mutation

In our `userLogin` query, we use a hashed version of the password to login. In order for
this to work, we need to hash the password when saving it to database, too. For this, we
need to customize the way `userCreate` works, by hooking in our own `userCreate` mutations.

This can easily be done creating a custom mutations, and using the `extends` keyword. This keyword
can be used to create a mutation that takes the exact same arguments and return types as one
of the basic CRUD function - in our case, `create`. Here is what our mutation will look like:

```js 
  mutations: {
    userCreate: {
      extends: 'create',
      async resolve({ args, resolvers: { User } }) {
        // "Hash" password
        const password = Buffer.from(args.record.password).toString('base64')

        // Create user
        return User.create({
          record: {
            ...args.record,
            password,
          }
        })
      }
    }
  },
```

## Going further

Now that our authentication service is in place, we can go ahead to securing and scoping our API.
