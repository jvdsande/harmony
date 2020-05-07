---
title: Setting up the login/signup form
sidebar_label: Tutorial - Setting up the login/signup form
---

In order for our user to access their todo-lists, they need to be able to authenticate.
Therefore, we need to build a login and signup form.

## Step 1 - Organizing our app

Our app will have two states: connected and disconnected. When disconnected,
the login form should be displayed ; when connected, a user should see their
todo-lists.

Let's start by creating three new files to hold our components: `app.js`, `login.js`
and `main.js`.

```shell script
touch src/app.js
touch src/login.js
touch src/main.js
```

For now the `login.js` and `main.js` file will return empty components:

```js title="login.js"
import React from 'react'

export default function Login() {
  return null
}
```

```js title="main.js"
import React from 'react'

export default function Main() {
  return null
}
```

And the `app.js` file implements a very simple switch logic to choose the right
component to display:

```js title="app.js"
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

## Step 2 - Building the form

Our `App` component taking care of our logged-in/out state, we can start building our 
login form. We'll make it really easy: an email and a password fields, and a "Login" and a "Sign up" button.

Let's use the following markup and basic form handling state:

```js title="src/login.js"
import React, { useState, useCallback } from 'react'

export default function Login({ login }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const changeEmail = useCallback((e) => setEmail(e.target.value), [setEmail])
  const changePassword = useCallback((e) => setPassword(e.target.value), [setEmail])

  const onLoginSubmit = useCallback((e) => {
    e.preventDefault()
  }, [email, password])
  const onSignupSubmit = useCallback((e) => {
    e.preventDefault()
  }, [email, password])

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


## Step 3 - Connecting to our server

With our login and signup form ready, all that is left is to connect the submit actions
to our server. This is done through the `Client` default export from the `@harmonyjs/query` package.

This object provides a `builder` property which creates a builder for GraphQL queries.

Let's use it in our component!