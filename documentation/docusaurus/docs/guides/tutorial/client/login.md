---
title: Setting up the login/signup form
sidebar_label: Setting up the login/signup form
---

In order for our user to access their todo-lists, they need to be able to authenticate.
Therefore, we need to build a login and signup form.

## Step 1 - Organizing our app

Our app will have two states: connected and disconnected. When disconnected,
the login form should be displayed ; when connected, a user should see their
todo-lists.

We'll also have two kinds of files: `components` which will hold the React code for
handling the UI, and `services` which will hold the HarmonyJS code for handling the
interaction with our API.

We'll usually start by creating the needed services for a given task, then dive
into the React code for the markup and connecting our services to the UI.

Our first step will be to create two folders to hold our files:

```shell script
mkdir src/components
mkdir src/services
```

Then, we can start building our components.

Let's start by creating three new files to hold our components: `app.js`, `login.js`
and `main.js`.

```shell script
touch src/components/app.js
touch src/components/login.js
touch src/components/main.js
```

For now the `login.js` and `main.js` file will return empty components:

```jsx title="components/login.js"
import React from 'react'

export default function Login() {
  return null
}
```

```jsx title="components/main.js"
import React from 'react'

export default function Main() {
  return null
}
```

And the `app.js` file implements a very simple switch logic to choose the right
component to display:

```jsx title="components/app.js"
import React, { useState, useCallback, useEffect } from 'react'

import Login from './login'
import Main from './main'

export default function App() {
  const [token, setToken] = useState(null)

  // Login function - sets and saves a new token
  const login = useCallback((token) => {
    window.localStorage.setItem('token', token)
    setToken(token)
  }, [])

  // Logout function - erases and unsets the token
  const logout = useCallback(() => {
    window.localStorage.removeItem('token')
    setToken(null)
  }, [])

  // On mount: check if a token was previously saved and restore it
  useEffect(() => {
    const savedToken = window.localStorage.getItem('token')

    if(savedToken) {
      login(savedToken)
    }
  }, [login])

  if(!token) {
    return <Login login={login} />
  }

  return <Main logout={logout} token={token} />
}

```

We use the `token` state variable to check whether we are connected or not, and
we provide two simple utility functions, `login` and `logout` which we pass to the
relevant components.

Finally, the `useEffect` hook allows us to restore a previously saved token upon
page mount.

## Step 2 - Creating our services

For our app, we'll need four services:

 * `ServiceClient` will be our entry service, providing access to HarmonyJS's client code.
 * `ServiceLogin` will handle all login-related tasks
 * `ServiceList` will handle list-related actions
 * `ServiceTodo` will handle todo-related actions
 
For now we'll focus on the first two, which will help us build the first page our users
will see: the login form.

**Implementing `ServiceClient`**

The `ServiceClient` one is pretty straightforward: it exposes two functions, one
used for configuring the client (setting the API endpoint, configuring the authorization
header...), and one for getting the client from other services.

Here it is implemented:

```jsx title="services/client.js
import Client from '@harmonyjs/query'

export default {
  // Configure HarmonyJS client
  configureClient(token) {
    const config = {
      graphql: {
        host: 'http://localhost',
        port: 3000,
        path: '/',
      },
      socket: {
        host: 'http://localhost',
        port: 3000,
      },
    }

    if(token) {
      // Add authorization headers if token was provided
      config.graphql.headers = {
        authorization: 'Bearer ' + token,
      }
    }

    Client.configure(config)
  },

  // Provide HarmonyJS client
  getClient() {
    return Client
  }
}
```

The `configureClient` function uses the host and port from our API tutorial. Since we've
configured our GraphQL endpoint to live on `/`, we set the path accordingly.

For the SocketIO part, we only need the host and port since we've left all other options
at default on the server side.

If we provide a `token` string to the function, it sets the `authorization` header for all
requests coming out of the client.

**Implementing `ServiceLogin`**

For our login process, we only need two things: a `login` request which fetches a token
based on some identification, and a `signup` request which creates a new user in database.

On the server, the first request corresponds to our `userLogin` query, while the second is a
`userCreate` mutation.

We can implement both those requests using `@harmonyjs/query` Client's `builder` property.

The builder property from Client can help us create GraphQL query in a very modular 
way and using natural language, helping us quickly move our prototyped queries 
from the Playground to code.

Here is how we would implement the `ServiceLogin` service:

```jsx title="services/login.js"
import ServiceClient from './client'

export default {
  // Login with the provided email and password
  login(email, password) {
    return ServiceClient.getClient()
      .builder
      .withName('userLogin')
      .withArgs({
        email,
        password,
      })
      .asQuery()
      .catch(() => null)
  },

  // Try creating a user with the provided email and password
  // Return `null` if the creation fails
  signup(email, password) {
    return ServiceClient.getClient()
      .builder
      .withName('userCreate')
      .withArgs({
        record: {
          email,
          password,
        }
      })
      .withSelection({
        _id: true,
      })
      .asMutation()
      .catch(() => null)
  }
}
```

Here we use our previously-defined `ServiceClient` to get a centralized access to the
`Client` default export from `@harmonyjs/query`. We then use the `builder` property to
create our two requests.

We chain all our requests with a `.catch(() => null)` statement because we are not 
interested in handling different exceptions. Instead, we'll simply check for a `null`
return value to determine if an error occurred or not.

In a real-world example, the exception sent by the server can be used in the `catch` block
to gracefully handle several error causes.



## Step 3 - Building the form

Our `App` component taking care of our logged-in/out state, we can start building our 
login form. We'll make it really easy: an email and a password fields, and a "Login" and a "Sign up" button.

Let's use the following markup and basic form handling state:

```jsx title="components/login.js"
import React, { useState, useCallback, useEffect } from 'react'

export default function Login({ login }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const changeEmail = useCallback((e) => setEmail(e.target.value), [])
  const changePassword = useCallback((e) => setPassword(e.target.value), [])

  const onLoginSubmit = useCallback(async (e) => {
    e.preventDefault()

    const token = null // Todo: get token from login query

    if(token) {
      login(token)
    } else {
      setError('Incorrect user or password')
    }
  }, [login, email, password])
  const onSignupSubmit = useCallback(async (e) => {
    e.preventDefault()

    const user = null // Todo: get user from signup query

    if(user) {
      onLoginSubmit(e)
    } else {
      setError('Email already in use')
    }
  }, [email, password, onLoginSubmit])

  useEffect(() => {
    // Todo: configure client on first mount, without token for login
  }, [])

  return (
    <div className="contents">
      <div className="card padding-bottom--md margin-top--xl shadow--md" style={{maxWidth: '480px', margin: 'auto'}}>
        <div className="card__header text--center">
          <h1>Login</h1>
        </div>

        <form onSubmit={onLoginSubmit} className="card__body text--left margin-left--xl margin-right--xl">
          <label htmlFor="email" className="text--bold">Email</label>
          <input
            type="text"
            name="email"
            className="button button--block button--outline button--primary margin--xs text--left"
            value={email}
            onChange={changeEmail}
          />
          <label htmlFor="password" className="text--bold">Password</label>
          <input
            type="password"
            name="password"
            className="button button--block button--outline button--primary margin--xs text--left"
            value={password}
            onChange={changePassword}
          />

          {
            error && (
              <div className="alert alert--danger margin-top--md">
                {error}
              </div>
            )
          }

          <div className="button-group button-group--block margin--md">
            <button type="submit" onClick={onLoginSubmit} className="button button--primary">Login</button>
            <button type="button" onClick={onSignupSubmit} className="button button--secondary">Signup</button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

:::note
As of now, Infima does not provide input styling, so we've used an outline-button
style for our inputs.
:::


## Step 4 - Connecting to our services

With our login and signup form ready, all that is left is to connect the submit actions
to our server.

In the previous markup, we can spot three "todo" comments marking the spots where our services
will come into play.
 
For the login task, we'll be using the two services we built previously: `ServiceClient`, a generic service giving access to
the HarmonyJS client as a whole, and `ServiceLogin`, a dedicated service for handling login-related
actions.

Here are the changes to make to our file in order to inject the services:

```jsx file="src/login.js" {3-4,17,28,38-39}
import React, { useState, useCallback, useEffect } from 'react'

import ServiceClient from '../services/client'
import ServiceLogin from '../services/login'

export default function Login({ login }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const changeEmail = useCallback((e) => setEmail(e.target.value), [])
  const changePassword = useCallback((e) => setPassword(e.target.value), [])

  const onLoginSubmit = useCallback(async (e) => {
    e.preventDefault()

    const token = await ServiceLogin.login(email, password)

    if(token) {
      login(token)
    } else {
      setError('Incorrect user or password')
    }
  }, [login, email, password])
  const onSignupSubmit = useCallback(async (e) => {
    e.preventDefault()

    const user = await ServiceLogin.signup(email, password)

    if(user) {
      onLoginSubmit(e)
    } else {
      setError('Email already in use')
    }
  }, [email, password, onLoginSubmit])

  useEffect(() => {
    // Configure client on first mount, without token for login
    ServiceClient.configureClient()
  }, [])
```

And here we go!

Our login and signup form is now fully connected to our server, with potential errors
caught and displayed for the user.

It is now possible to create new users using the form with the `Sign up` button,
or to connect using our existing user through the `Login` button.

Try inputting our user's credentials:

```
email: todo@harmonyjs.io
password: 1234
```

You should land on a blank page: this is the `Main` component being shown in place of the
`Login` component, since the token has now been set.


## Going further

With our login page working, we can proceed with creating the main page of the app: the
list of our user's todo-lists.
