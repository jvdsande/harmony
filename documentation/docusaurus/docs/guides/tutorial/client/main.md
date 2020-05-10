---
title: Creating the main page
sidebar_label: Creating the main page
---

We now have built our two first services, and have our login form ready and working.

We can now start building the app's main attraction: the todo-list page!

## Step 1 - Creating `ServiceList`

Since our `Main` component will be handling our lists, we need to build our `List` service.

This service will be a little more complex than our previous `ServiceLogin`, since we need
to handle a bunch of actions for lists: fetching, creating, updating, deleting, sharing...

The structure of our service will be as follows:

```jsx title="services/list.js"
import { Accessor } from '@harmonyjs/query'

const AccessorList = Accessor('List')

export default {
}
```

We are here using a new feature from `@harmonyjs/query`: the [`Accessor`](/docs/api/query#accessor)
factory. This factory takes a model's name in parameter, and returns a dedicated builder
for CRUD operations, which will come in handy for our service.

**Creating the `fetchAll` request**

Our first step will be to create a `fetchAll` function creating a query for fetching all 
lists.

This can be done really easily through the `Accessor`'s `query.list` helper:

```jsx title="services/list.js" {6-31}
import { Accessor } from '@harmonyjs/query'

const AccessorList = Accessor('List')

export default {
  // Create a list query fetching all of a user's list
  fetchAll() {
    return AccessorList.query
      .list
      .select({
        _id: true,
        name: true,
        description: true,
        isOwner: true,
        todos: {
          _id: true,
          status: true,
          description: true,
        },
        info: {
          nbTotal: true,
          nbDone: true,
          nbPending: true,
        },
        sharedTo: {
          _id: true,
          email: true,
        }
      })
      .listen('Todo')
  },
}
```

Here we can see that we select a lot of information from our list: its name and description,
whether we are the owner or not, it's list of todos... We'll need all this to display
it correctly.

We also add a `.listen` clause to our builder: this will make the query respond to changes
to the `Todo` collection, allowing the list to reload when a todo is added, even though
that does not impact any `List` document directly.

The return value here is _the builder itself_, not a `Promise`. The `Accessor` builders
implement the `Promise` specification, meaning they are `thenable` and `awaitable`.

Here, since we return the builder directly, we can decide in the calling function
whether we want to run it as a promise (once), or subscribe to it with a callback which
will be called each time the underlying data changes.


**Creating the `create` request**

Next, we'll want to make a `create` request for creating new lists. Once again, the `Accessor`
provides us with an easy way to do it through the `mutate.create` builder.


```jsx title="services/list.js" {10-20}
import { Accessor } from '@harmonyjs/query'

const AccessorList = Accessor('List')

export default {
  // Create a list query fetching all of a user's list
  fetchAll() {
    ...
  },

  // Create a list with the given name
  create(name) {
    return AccessorList.mutate
      .create
      .withRecord({
        name,
        description: '',
      })
      .catch(() => null)
  },
}
```

In this new function, we add a `.catch(() => null)` clause to the builder. This has two effects:

 * It hides any error from the server, because we are not interested in errors in this
 tutorial
 * It actively converts the builder to a Promise, meaning the value returned from
 this function is a one-off Promise and not the builder itself anymore, as was the case
 in the `fetchAll` function.


**Creating the `updateName` and `updateDescription` requests**

After creating a list, we want to be able to edit its name and description at any time.

We will be using yet another `Accessor` builder, `mutate.update`.

:::note
As you might have noticed by now, all CRUD write operations live in the `mutate` property while
all read operations live in the `query` property. This maps naturally to the server's GraphQL schema.
:::

Here are our two very similar requests implemented:


```jsx title="services/list.js" {15-32}
import { Accessor } from '@harmonyjs/query'

const AccessorList = Accessor('List')

export default {
  // Create a list query fetching all of a user's list
  fetchAll() {
    ...
  },

  // Create a list with the given name
  create(name) {
    ...
  },

  // Update the given list's name
  updateName(list, name) {
    return AccessorList.mutate
      .update
      .withId(list)
      .withRecord({ name })
      .catch(() => null)
  },

  // Update the given list's description
  updateDescription(list, description) {
    return AccessorList.mutate
      .update
      .withId(list)
      .withRecord({ description })
      .catch(() => null)
  },
}
```

Once again we use the `.catch(() => null)` to catch potential errors and convert the builder
to a `Promise`. Here, one error might arise and will be silently caught: trying to edit
a list of which we are not the owner. All of this will be completely invisible to the user.

**Creating the `delete` request**

Next, we want to be able to delete a list. Without surprise at this point, this is done
through the `mutate.delete` builder.


```jsx title="services/list.js" {25-32}
import { Accessor } from '@harmonyjs/query'

const AccessorList = Accessor('List')

export default {
  // Create a list query fetching all of a user's list
  fetchAll() {
    ...
  },

  // Create a list with the given name
  create(name) {
    ...
  },

  // Update the given list's name
  updateName(list, name) {
    ...
  },

  // Update the given list's description
  updateDescription(list, description) {
    ...
  },

  // Delete the given list
  delete(list) {
    return AccessorList.mutate
      .delete
      .withId(list)
      .catch(() => null)
  },
}
```

**Creating the `share` request**

Last, we need a request to share a list. As this is a custom mutation, we won't
be able to use a pre-configured builder through the `Accessor`. Instead, we'll
need to use the `Client`'s generic builder just as we did in the `ServiceLogin` example.

For this, we need to import our `ServiceClient`.



```jsx title="services/list.js" {3,32-45}
import { Accessor } from '@harmonyjs/query'

import ServiceClient from './client'

const AccessorList = Accessor('List')

export default {
  // Create a list query fetching all of a user's list
  fetchAll() {
    ...
  },

  // Create a list with the given name
  create(name) {
    ...
  },

  // Update the given list's name
  updateName(list, name) {
    ...
  },

  // Update the given list's description
  updateDescription(list, description) {
    ...
  },

  // Delete the given list
  delete(list) {
    ...
  },

  // Share the given list to the provided email
  share(list, email) {
    return ServiceClient.getClient().builder
      .withName('listShare')
      .withArgs({
        list,
        email,
      })
      .withSelection({
        _id: true,
      })
      .asMutation()
  }
}
```

## Step 2 - Creating the `NewList` component

Before building our `Main` component, we need to prepare its dependencies. It will rely
on two subcomponents: `List`, which handles displaying a `List`, and `NewList`, a simple
form for creating a new `List` element.

We'll start by creating the `NewList` component. As `List` is a bit more complex, it will
be discussed in [its own section](/docs/guides/tutorial/client/list)

Let's start by creating the file for it:

```shell script
mkdir src/components/main
touch src/components/main/new-list.js
```

We can now create our component. It will use our `ServiceList`'s `create` request to 
create the list from the form's data.

It's markup is very simple:

```jsx title="components/main/new-list.js
import React, { useState, useCallback } from 'react'

import ServiceList from '../../services/list'

export default function NewList() {
  const [name,setName] = useState('')
  const changeName = useCallback((e) => setName(e.target.value), [setName])

  const onCreateSubmit = useCallback(async (e) => {
    e.preventDefault()

    if(name) {
      await ServiceList.create(name)
    }

    setName('')
  }, [name, setName])

  return (
    <div className="card margin-top--xs" style={{maxWidth: '480px', margin: 'auto'}}>
      <form onSubmit={onCreateSubmit} className="card__body text--left">
        <div className="row">
          <div className="col col--8">
            <input
              type="text"
              name="new-list"
              placeholder="New list name"
              className="button button--block button--outline button--primary text--left"
              value={name}
              onChange={changeName}
            />
          </div>
          <div className="col col--4">
            <button
              type="submit"
              onClick={onCreateSubmit}
              className="button button--block  button--primary"
            >
              Create
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
```

:::note
In the `onCreateSubmit` callback, we use our `create` request, which requires that we are
authenticated first. This is OK because `NewList` will be a children of `Main`, which will
be responsible of configuring our `Client`.
:::

## Step 3 - Creating our `Main` component

For our `Main` component, we need to display a simple layout with a topbar, our form
for creating a new list, and our lists shown as cards.

In its lifecycle, we also need to configure the `@harmonyjs/query` `Client` to use our
authentication token, and we need to subscribe to the `List` model in order to keep
our UI up-to-date.

Here is a sample implementation of our component:

```jsx title="components/main.js"
import React, { useEffect, useState } from 'react'

import { FaPowerOff } from 'react-icons/fa'

import ServiceClient from '../services/client'
import ServiceList from '../services/list'

import NewList from './main/new-list'

export default function Main({ logout, token }) {
  const [lists, setLists] = useState([])

  useEffect(() => {
    // Configure client with token
    ServiceClient.configureClient(token)

    // Subscribe to lists
    const subscription = ServiceList.fetchAll()
      .subscribe(setLists)
  
    // Cancel subscription on unmount
    return () => subscription.unsubscribe(setLists)
  }, [token, setLists])

  return (
    <React.Fragment>
      <header className="navbar navbar--fixed-top">
        <div className="navbar__items">
          <div className="navbar__brand">
            Todo-lists
          </div>
        </div>
        <div className="navbar__items navbar__items--right">
          <button className="navbar__item button button--link" onClick={logout}>
            <FaPowerOff />
          </button>
        </div>
      </header>
      <main className="contents" style={{backgroundColor: "#F5F5FA", minHeight: "calc(100vh - 4rem)"}}>
        <NewList />

        <div className="container container--fluid row row--align-top">
          {/* Todo: display lists */}
        </div>
      </main>
    </React.Fragment>
  )
}
``` 

In the `useEffect` hook, we connect our API to our UI using our defined service.
Here, we use our service to create the list query which will retrieve all of our user's
`List`, and we _subscribe_ to it. 

In HarmonyJS, such a subscription will make sure the UI is kept up-to-date when the
underlying data changes on the server. It uses the Socket.IO connection to subscribe
to change events, and re-runs the query when the underlying data is updated.

The provided callback to our subscription will be called each time the query runs, 
but only if the response was different from the previous one, avoiding updating the
UI for false-positives.

In our case, said callback is the `setLists` state-mutating function, which keeps the
`lists` state variable in sync with our data.

And with this, we have our `Main` page complete for now - it's only missing the actual
display of `List`s. 
It's now possible to logout using the icon on the top bar, 
and create todo lists using the dedicated form.

## Next steps

We are now ready to create the last missing piece of our `Main` component: the `List`
component displaying a `List`'s details!
