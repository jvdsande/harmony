---
title: Creating a web server
sidebar_label: Creating a web server
---

The first step into building a web application is creating our web-server.

This server will expose our API needed for authenticating users, retrieving lists and updating
todos - all the actions our users will need to use our app.

## Step 1 - Creating a NodeJS application

Creating a new NodeJS application is as simple as running `npm init` in a new directory.
First, create a `harmony-todolist` directory, which will hold our server and client code.

Then, create a new folder `server` inside the `harmony-todolist` directory. Finally, run
the `npm init` command from within the `server` directory.

```shell script
mkdir harmony-todolist
mkdir harmony-todolist/server
cd harmony-todolist/server
npm init
```

You should now have a `package.json` file ready to use inside your `server` directory.

Go ahead and run the following command :

```shell script
npm install -D esm
```

This will install the `esm` packages, which will allow us to write ES6-compliant code and
run it from Node without having to transpile it.

Finally, replace the content of `package.json` with the following:

```json title="package.json"
{
  "name": "server",
  "version": "1.0.0",
  "scripts": {
    "start": "node -r esm src/index.js"
  },
  "devDependencies": {
    "esm": "^3.2.25"
  }
}
```

We've simply added a new `start` script requiring `esm` at runtime.

The `start` scripts executes the `index.js` file found at the root of the `src` folder.
Go ahead and create both the folder and the file:

```shell script
mkdir src
touch src/index.js
```

## Step 2 - Add `@harmonyjs/server`

Now that we have our basic NodeJS application, it is time to add the HarmonyJS framework!

Run the following command to install the server package:

```shell script
npm install @harmonyjs/server
```

And simply import the `Server` default export in your newly created `index.js`.

```js title="index.js"
import Server from '@harmonyjs/server'
```

## Step 3 - Create and configure a Server instance

We are now all set to create our server. Firstly, we will create an `async function run()` 
function wrapper to take advantage of the `async/await` syntax for Promise handling.

Then, we will create and configure our server instance, logging any output to the console.

This is what our `index.js` now looks like:

```js title="index.js"
import Server from '@harmonyjs/server'

async function run() {
  const server = Server()

  await server.initialize({
    log: {
      console: true,
    },
  })
}

run()
```

## Step 4 - Launching our new application

With just those few lines of code, we are ready to launch our application. A Fastify web server
will be initialized on port `3000`, but we won't be able to access it yet since we
haven't defined any routes.

```shell script
npm start

> server@1.0.0 start /.../harmony-todolist/server
> node -r esm src/index.js

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

And just like that, we have our server up and running, ready to be configured to serve our
data.

## Going further

The next step will now be to add a _persistence layer_, in other terms configure our data by 
describing their format and how to access them.
