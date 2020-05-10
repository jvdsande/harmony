---
title: Creating a web client
sidebar_label: Creating a web client
---

If you've followed the previous guides, you should now have a working API server.

If you've come here to follow the client-side tutorial only, you can grab the server code
in the [Github Repository](https://github.com/harmony-js/tutorial/tree/master/server).

The client code we'll build will use [React](https://reactjs.org/) as a UI library,
and [Infima](https://facebookincubator.github.io/infima/docs/getting-started/introduction)
for the CSS part. 

## Step 1 - Bootstraping the app

In the previous section, we've created a `harmonyjs-todolist` folder in which we created
a `server` subfolder which now contains all our server code.

We'll now create a `client` subfolder next to `server`, which will hold the client code.

Open a shell in the `harmonyjs-todolist` folder and run the following command:

```shell script
npx create-react-app client --template empty
```

This will create a new NPM project already configured to use React. Using the `empty` 
template, we get rid of any boilerplate code Create-React-App usually gives us.

## Step 2 - Adding dependencies

You can now navigate to the newly-created `client` directory and install the two missing
pieces: `infima` for the styling and `@harmonyjs/query` to communicate with our backend. 
In top of that, we'll use the awesome `react-icons` package to easily gain access to icons
libraries such as FontAwesome or Material Icons.

We'll also install `cross-env` as a development dependency to allow changing the running
port of our client.

```shell script
cd client
npm install infima react-icons @harmonyjs/query
npm install -D cross-env
```

## Step 3 - Preparing the client

Change your `start` script in `package.json` to use port `3001`, as `3000`, the default for
react-scripts and HarmonyJS, is already used by our server.

```json {2}
  "scripts": {
    "start": "cross-env PORT=3001 react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
```

Finally, edit the created `src/index.js` file to inject the Infima styling:

```jsx {4}
import React from 'react'
import ReactDOM from 'react-dom'

import 'infima/dist/css/default/default.css'

ReactDOM.render(
  <React.StrictMode>
    <h1>React App</h1>
  </React.StrictMode>,
  document.getElementById('root')
)
```

You can now start your client development server by running `npm start`.

You should see an empty page featuring a lone title stating `React App`.

## Next steps

Now that our client app is running, we can start building our todo application.

The first step will be creating the login/signup form.
