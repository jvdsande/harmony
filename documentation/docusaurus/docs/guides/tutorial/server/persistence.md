---
title: Adding a persistence layer
sidebar_label: Adding a persistence layer
---

Now that our server is starting, we need to configure our persistence layer in order to start
serving data. This is done through the `@harmonyjs/persistence` package.

## Step 1 - Install the package

The first step is simply to add the new dependency to our project:

```shell script
npm install @harmonyjs/persistence
```

We can then import the `Persistence` default export at the top of our `index.js` file:

```js {2} title="index.js"
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

```

## Step 2 - Create and configure the Persistence instance

Just like the Server instance from the previous guide, we need to create and initialize our 
Persistence instance to start using data.

This is done the same way as for the `Server` object: creating a new instance using the factory
function, then configuring it through its `initialize` method.

We will initialize our Persistence instance _before_ our Server instance, so that the
Server launch stays our last action:

```js {5,7-12} title="index.js"
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

async function run() {
  const persistence = new Persistence()
  const server = Server()

  await persistence.initialize({
    log: {
      console: true,
    }
  })

  await server.initialize({
    log: {
      console: true,
    },
  })
}

run()
```

If we now start up our application again, we will see our Persistence instance being initialized:

```shell script {1-3}
20/01/01 12:00:00:000 Persistence      [WARNING] No default adapter was specified. Will fallback to adapter 'mock'
20/01/01 12:00:00:000 Persistence      [INFO   ] Initializing Persistence instance with 0 models
20/01/01 12:00:00:000 Persistence      [INFO   ] Adapters: [] - default: mock
20/01/01 12:00:00:000 Server           [INFO   ] Powered by
   _    _
  | |  | |
  | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
  |  __  |/ _` | '__| '_ ` _ \ / _ \| '_ \| | | |
  | |  | | (_| | |  | | | | | | (_) | | | | |_| |
  |_|  |_|\__,_|_|  |_| |_| |_|\___/|_| |_|\__, |
                                            __/ |
                                           |___/
20/01/01 12:00:00:000 Server           [INFO   ] Initializing Fastify Server
20/01/01 12:00:00:000 Server           [INFO   ] Initializing Socket.IO layer
20/01/01 12:00:00:000 Server           [INFO   ] Main server created on port localhost:3000
```

During its initialization, `Persistence` gives us a bunch of information about what it accomplishes
based on its given configuration. In our case, it starts with a _warning_: we did not provide any default
adapter, and so the instance falls back to using the `mock` adapter.

We will come back to _adapters_ when configuring access to our MongoDb server.

The second piece of information logged out by `Persistence` is the fact that it started with no models.

Models are the core of `Persistence`'s functionality. Each model describes one set of data where
all items share a similar shape. In the case of our todo-list application, we already know a bunch of
models: users, lists, todos, and comments.

## Step 3 - Serving our persistence instance

So we now have our `Server` and `Persistence` instance both up and running - it's now time to 
connect the dots, and start serving our API.

`Persistence`'s main goal is to provide a fully featured GraphQL API which can then be exposed
through our `Server` on a given endpoint. This is done by configuring our server through `controllers`.

Controllers take their name from old-fashioned MVC frameworks such as Java Spring. They are in fact
a bit different from standard MVC controllers, in the way that they are not really orchestrators
for data access - this is more the `Persistence` instance's role. Instead, they are more like
_plugins_ for the `Server` instance: ways for the user to interact with the underlying Fastify
server and add routes.

In our case, we will be using controllers that are already mostly pre-configured: the `ControllerGraphQL` and `ControllerEvents`
object exposed by our `Persistence` instance. The first controller adds a GraphQL endpoint to our Server,
configured to expose a schema made from our Persistence models, while the second transfers
internal `Persistence` events to the Socket.IO layer for the clients to subscribe to.

These controllers can be found as children of our `Persistence` instance's `controllers` property. We
add them to our server by adding them to the `controllers` array in its config:

```js {2-7}  title="index.js"
  await server.initialize({
    controllers: [
      persistence.controllers.ControllerGraphQL({
        path: '/',
        enablePlayground: true,
      }),
      persistence.controllers.ControllerEvents(),
    ],
    log: {
      console: true,
    },
  })
```

If we now restart our application:

```shell script {15-18}
20/01/01 12:00:00:000 Persistence      [WARNING] No default adapter was specified. Will fallback to adapter 'mock'
20/01/01 12:00:00:000 Persistence      [INFO   ] Initializing Persistence instance with 0 models
20/01/01 12:00:00:000 Persistence      [INFO   ] Adapters: [] - default: mock
20/01/01 12:00:00:000 Server           [INFO   ] Powered by
   _    _
  | |  | |
  | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
  |  __  |/ _` | '__| '_ ` _ \ / _ \| '_ \| | | |
  | |  | | (_| | |  | | | | | | (_) | | | | |_| |
  |_|  |_|\__,_|_|  |_| |_| |_|\___/|_| |_|\__, |
                                            __/ |
                                           |___/
20/01/01 12:00:00:000 Server           [INFO   ] Initializing Fastify Server
20/01/01 12:00:00:000 Server           [INFO   ] Initializing Socket.IO layer
20/01/01 12:00:00:000 ControllerGraphQL [INFO   ] Registering GraphQL endpoint...
20/01/01 12:00:00:000 ControllerGraphQL [INFO   ] GraphQL endpoint at /
20/01/01 12:00:00:000 ControllerGraphQL [INFO   ] GraphQL playground at /
20/01/01 12:00:00.000 ControllerEvents  [INFO   ] Persistence events are forwarded to Socket.IO
20/01/01 12:00:00:000 Server            [INFO   ] Main server created on port localhost:3000
```

We can see that the newly-added controllers added two new endpoints, both at path `'/'`.

The first one is in fact a `POST` endpoint serving the GraphQL API, while the second one is a `GET`
endpoint used for accessing the GraphQL Playground, which we enabled previously in the
controller's configuration.

If you now navigate to [`http://localhost:3000`](http://localhost:3000), you should see the
GraphQL Playground being loaded, poviding two `Docs` and `Schema` tabs allowing you to see
your current GraphQL schema.

It's for now mostly empty, except for a few default scalars and directives used by [Apollo Federation](https://www.apollographql.com/docs/apollo-server/federation/introduction/).

Let's remedy that by creating our first model: the `User` model!

## Step 4 - Adding our first model

We will be keeping all of our models in a `models` subfolder in `src`. Each model will then be kept
inside its own subfolder. Go ahead and create the `models` and `models/user` folders:

```shell script
mkdir src/models
mkdir src/models/user
``` 

Now create an `index.js` file in the `user` directory, filled as follows:

```js title="models/user/index.js"
import schema from './schema'

export default {
  schema,
}
```

And since our new file needs a `schema.js` file, create it alongside it with the following content:

```js title="models/user/schema.js"
export default {}
```

We are now ready to fill our model's _schema_: the description of what data from our model will look like.

In our case, users will be pretty straightforward: an email, and a password. For security reason,
the password should not be readable, but it still is a part of our schema so that it can be
stored in our database.

Defining a Persistence schema is done through the [`Types`](/docs/api/persistence#types) named export
of the `@harmonyjs/persistence` package.

In our case, it will look as follows:

```js title="models/user/schema.js" {1,4-5}
import { Types, PropertyMode } from '@harmonyjs/persistence'

export default {
  email: Types.String.required.indexed.unique,
  password: Types.String.required.withMode(PropertyMode.INPUT)
}
```

We start by importing the `Types` helper, alongside the `PropertyMode` enum that will help us mark
the password as write-only.

Then we define our schema:
* An `email` field of type `String`, marked as required, indexed and unique
* A `password` field also of type `String` and marked as required, specifically marked as `INPUT` only.

Now that our model is ready, we still need to inject it to our Persistence instance. This is done
through the `models` map of the Persistence configuration object, in `index.js`:

```js title="index.js" {4,11-13}
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import User from './models/user'

async function run() {
  const persistence = new Persistence()
  const server = Server()

  await persistence.initialize({
    models: {
      User,
    },
    log: {
      console: true,
    }
  })
```

If we now relaunch our server, we will see the model being imported by Persistence:

```shell script {3}
20/01/01 12:00:00:000 Persistence      [WARNING] No default adapter was specified. Will fallback to adapter 'mock'
20/01/01 12:00:00:000 Persistence      [INFO   ] Initializing Persistence instance with 1 models
20/01/01 12:00:00:000 Persistence      [INFO   ] Model 'User' imported.
20/01/01 12:00:00:000 Persistence      [INFO   ] Adapters: [] - default: mock
```

We can already see our new model appearing in the Playground. We can even play around with
some sample queries. For instance, try running the following query in the Playground:

```graphql
query {
  userList {
    _id
    email
  }
}
```

You should get the following output:

```json
{
  "data": {
    "userList": [
      {
        "_id": "mocked-id",
        "email": "Hello World"
      },
      {
        "_id": "mocked-id",
        "email": "Hello World"
      }
    ]
  }
}
```

> _But wait! Where is that data coming from?_

When starting a Persistence instance with no database adapter, HarmonyJS automatically _mocks_
the schema, returning default values for each type. This way, it is possible to validate the
schema as early as possible, without needing actual data - nor even an actual database!

Feel free to look into the various queries, mutations and types Harmony has generated based on 
the `User` model. All the basics CRUD operations are there: Read, List, Count, Create, Update, Delete.

## Step 5 - Adding the rest of our models

Now that we have our first model, let's apply the same logic to add our three other models.

**List model**

A list uses the following fields:
 * A name
 * A description
 * A link to its owner
 * A list of users it was shared to
 
And here is how we would create this as a Harmony schema:

```js title="models/list/schema.js"
import { Types } from '@harmonyjs/persistence'

export default {
  name: Types.String.required,
  description: Types.String,
  owner: Types.Reference.of('User'),
  sharedTo: [Types.Reference.of('User')],
}
```

Notice how we used the `Types.Reference` special type to create a link between our two models.

The `sharedTo` field also uses the array shorthand syntax to describe a field holding an
array of references.


**Todo model**

A todo is made of the following fields:
 * A description
 * A status (done/not done)
 * A link to the list it is part of

Its Harmony schema is as follows:

```js title="models/todo/schema.js"
import { Types } from '@harmonyjs/persistence'

export default {
  description: Types.String.required,
  status: Types.Boolean,
  list: Types.Reference.of('List').required,
}
```


**Comment model**

Lastly, we want to be able to comment on todos. Comments have the following structure:
 * The content of the comment
 * The date of the comment
 * A link to the author
 * A link to the todo

Or, written in Harmony:

```js title="model/comment/schema.js"
import { Types } from '@harmonyjs/persistence'

export default {
  content: Types.String.required,
  date: Types.Date.required,
  author: Types.Reference.of('User'),
  todo: Types.Reference.of('Todo'),
}
```


And now that we have all our models, we simply add them all to the Persistence initialization:

```js title="index.js" {5-7,16-18}
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import User from './models/user'
import List from './models/list'
import Todo from './models/todo'
import Comment from './models/comment'

async function run() {
  const persistence = new Persistence()
  const server = Server()

  await persistence.initialize({
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

Back to the Playground, we can now have access to our complete data-structure.

Thanks to the _reference_ fields we used to build our models, we can access deeply-linked
data easily through one query using GraphQL. Try the following query, for instance:

```graphql
query {
  comment {
    content
    author {
      email
    }
    todo {
      description
      list {
        name
        owner {
          email
        }
      }
    }
  }
}
```

This query spans our four models, following various links that we defined.

## Going further 

Now that our data structure is complete, we need to polish our API before starting developing
the client. Here are the elements still missing:

 * Authentication logic
 * Database connection
 * A few computed fields to enrich our data
