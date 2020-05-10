---
title: Connecting a database
sidebar_label: Connecting a database
---

As discussed in the [Getting started](/docs/guides/tutorial/introduction#server-side-technologies) chapter,
this sample application will be using MongoDb as a storing database.

At this point, we have a fully defined API complete with access rights and allowing complex
queries _via_ model references. We are therefore ready to connect our application to MongoDb.

:::note
While advanced MongoDb knowledge is not needed for this tutorial, you should at least be
able to make it run locally. Refer to [MongoDb's tutorial](https://docs.mongodb.com/manual/installation/#mongodb-community-edition-installation-tutorials) to setup Mongo on your computer.
:::

## Step 1 - Installing the `Adapter`

Where `Controller` are plugins for `@harmonyjs/server` allowing to extend the server's
abilities and expose routes, `Adapter` are plugins for `@harmonyjs/persistence` handling
the connection to underlying databases.

A Persistence instance can be configured to use as many `Adapter` as required, connecting
to as many databases as it needs. Model references will be honored even trans-database.

For our sample application, we only need one `Adapter`, connecting our app to MongoDb. 
Such an `Adapter` is already available as a standard HarmonyJS package: `@harmonyjs/adapter-mongoose`.

As the name suggests, this adapter uses the `mongoose` library to enforce schema definition
all down to the Mongo driver.

We will need to install it as a dependency, using the following command:

```shell script
npm install @harmonyjs/adapter-mongoose mongoose
```

`@harmonyjs/adapter-mongoose` uses `mongoose` as a _peer_ dependency, meaning it is the
app's responsibility to install the `mongoose` package. This avoids having the `mongoose`
version tightly tied to the `Adapter` package.


## Step 2 - Initializing the `Adapter`

The next step is simply to initialize the adapter. In order to do that, we simply need to
import it in our `index.js` file, and add it to the `adapters` map of Persistence's configuration.


```js title="index.js" {5-6,25-31}
import Server from '@harmonyjs/server'
import Persistence from '@harmonyjs/persistence'

import ControllerAuthenticationJWT from '@harmonyjs/controller-auth-jwt'

import AdapterMongoose from '@harmonyjs/adapter-mongoose'

import User from './models/user'
import List from './models/list'
import Todo from './models/todo'
import Comment from './models/comment'

async function run() {
  const persistence = new Persistence()
  const server = Server()

  await persistence.initialize({
    strict: true,
    models: {
      User,
      List,
      Todo,
      Comment,
    },
    adapters: {
      mongo: AdapterMongoose({
        host: 'mongodb://localhost:27017',
        database: 'todolist',
      }),
    },
    defaultAdapter: 'mongo',
    log: {
      console: true,
    }
  })
```

We've added our new adapter with the name `mongo` in our `adapters` map, and configured it
to connect at `localhost:27017` with the database `'todolist'`.

We've also configured Persistence to use `'mongo'` as it's default adapter, meaning that models
that do not specify an adapter will be using this one by default.

In the startup logs, we should now see the following:

```shell script {2-5,22-23}
20/01/01 12:00:00.000 Persistence      [INFO   ] Adapters: [mongo] - default: mongo
20/01/01 12:00:00.000 AdapterMongoose  [INFO   ] Initializing Mongoose Adapter
20/01/01 12:00:00.000 AdapterMongoose  [INFO   ] Converting Schemas
20/01/01 12:00:00.000 AdapterMongoose  [INFO   ] Creating Mongoose models
20/01/01 12:00:00.000 AdapterMongoose  [INFO   ] Connecting to MongoDB
20/01/01 12:00:00.000 Server           [INFO   ] Powered by
   _    _
  | |  | |
  | |__| | __ _ _ __ _ __ ___   ___  _ __  _   _
  |  __  |/ _` | '__| '_ ` _ \ / _ \| '_ \| | | |
  | |  | | (_| | |  | | | | | | (_) | | | | |_| |
  |_|  |_|\__,_|_|  |_| |_| |_|\___/|_| |_|\__, |
                                            __/ |
                                           |___/
20/01/01 12:00:00.000 Server           [INFO   ] Initializing Fastify Server
20/01/01 12:00:00.000 Server           [INFO   ] Initializing Socket.IO layer
20/01/01 12:00:00.000 ControllerAuthenticationJWT [INFO   ] Authentication system initialized
20/01/01 12:00:00.000 ControllerGraphQL           [INFO   ] Registering GraphQL endpoint...
20/01/01 12:00:00.000 ControllerGraphQL           [INFO   ] GraphQL endpoint at /
20/01/01 12:00:00.000 ControllerGraphQL           [INFO   ] GraphQL playground at /
20/01/01 12:00:00.000 Server                      [INFO   ] Main server created on port localhost:3000
20/01/01 12:00:00.000 AdapterMongoose             [INFO   ] Mongo connected
20/01/01 12:00:00.000 AdapterMongoose             [INFO   ] Mongoose Adapter successfully initialized
```


## Step 3 - Creating our first user

Now that we've configured our database access, we can finally test our API by creating
our first user!

Enter the following mutation in the Playground:

```graphql
mutation {
  userCreate(record: {
    email: "todo@harmonyjs.io",
    password: "1234",
  }) {
    _id
  }
}
```

And you should get the following output (except for the ID which will be different, naturally):

```json
{
  "data": {
    "userCreate": {
      "_id": "5eb2e26b1d530835d411324a"
    }
  }
}
```

If we then run a `user` query to fetch our user info, we would get an error saying we need
to be authenticated: that is our security layer into action. Let's follow its recommendation, 
and login, using our `userLogin` custom query!

```graphql
query {
  userLogin(email: "todo@harmonyjs.io", password: "1234")
}
```

Which should provide us with a token in the following response:

```json
{
  "data": {
    "userLogin": "<--your_token_here-->"
  }
}
```

In order to use this token as authentication, we now need to customize the headers sent
to the server with each request. In the Playground, this can be done using the `HTTP HEADERS` section
found in the bottom-left corner. Fill it like this:

```json
{
	"authorization": "Bearer <--your_token_here-->"
}
```

And you can finally launch the `user` query correctly! Here are the query and the corresponding
answer:

```graphql
query {
  user {
    _id
    email
  }
}
```

```json
{
  "data": {
    "user": {
      "_id": "5eb2e26b1d530835d411324a",
      "email": "todo@harmonyjs.io"
    }
  }
}
```

As you can see, our scopes are working well: the user query, even though we did not parametrize it,
returns the correct user.

## Going further

We finally have our API fully up-and-running, allowing us to read and write in our database.

We are now ready to start building our client - but first, we fill put the finishing touch to
our server by adding a few computed fields to our models, making them that much easier to use.
