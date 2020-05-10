---
title: Creating the List component
sidebar_label: Creating the List component
---

We can now build our `List` component: a component displaying a card holding a `List`'s info and todos.

## Step 1 - Creating the `ServiceTodo` service

We'll not go into as much details as for the `ServiceList`, as this service is mostly equivalent,
but this time related to `Todo` requests. We find five requests in this service:

 * Creating a todo
 * Toggling a todo between done and pending
 * Deleting a todo
 * Commenting on a todo
 * Listing comments for a todo
 
The first three actions will be done through a `Todo` `Accessor`, and the last two through a
`Comment` `Accessor`. Here is our service implemented:

```jsx title="services/todo.js"
import { Accessor } from '@harmonyjs/query'

const AccessorTodo = Accessor('Todo')
const AccessorComment = Accessor('Comment')

export default {
  // Create a todo with the given description
  create(list, description) {
    return AccessorTodo.mutate
      .create
      .withRecord({
        list,
        description,
      })
      .catch(() => null)
  },

  // Toggle the state of the given todo
  toggle(todo, list) {
    return AccessorTodo.mutate
      .update
      .withId(todo._id)
      .withRecord({
        list,
        status: !todo.status,
      })
      .catch(() => null)
  },

  // Delete the given todo
  delete(todo) {
    return AccessorTodo.mutate
      .delete
      .withId(todo._id)
      .catch(() => null)
  },

  // Create a new comment on a todo
  comment(todo, content) {
    return AccessorComment.mutate
      .create
      .withRecord({
        todo,
        content,
        date: new Date().toISOString(),
      })
      .catch(() => null)
  },

  // List all comments for a given todo
  fetchComments(todo) {
    return AccessorComment.query
      .list
      .where({ todo })
      .select({
        author: {
          _id: true,
          email: true,
        },
        content: true,
        date: true,
      })
  }
}
```

## Step 2 - Creating the `NewTodo` component

This component will mostly work like the `NewList` component. It shares similar markup
and logic, but is used to create a `Todo` instead of a `List`. 

Let's start by creating the file:

```shell script
mkdir src/components/main/list
touch src/components/main/list/new-todo.js
```

And then filling it with the following implementation:

```jsx title="components/main/list/new-todo.js"
import React, { useState, useCallback } from 'react'

import ServiceTodo from '../../../services/todo'

export default function NewTodo({ list }) {
  const [description,setDescription] = useState('')
  const changeDescription = useCallback((e) => setDescription(e.target.value), [setDescription])

  const onCreateSubmit = useCallback(async (e) => {
    e.preventDefault()

    if(description) {
      await ServiceTodo.create(list, description)
    }

    setDescription('')
  }, [list, description])

  return (
    <form onSubmit={onCreateSubmit} className="row padding--md">
      <div className="col col--8">
        <input
          type="text"
          name="new-list"
          placeholder="New todo"
          className="button button--block button--outline button--primary text--left"
          value={description}
          onChange={changeDescription}
        />
      </div>
      <div className="col col--4">
        <button
          type="submit"
          onClick={onCreateSubmit}
          className="button button--block button--primary"
        >
          Create
        </button>
      </div>
    </form>
  )
}
```

## Step 3 - Creating the `List` component

Now that we've prepared our `NewTodo` component, we can build our `List` component.

First, let's create the file:

```shell script
touch src/components/main/list.js
```

Then, fill it with the following content:

```jsx title="components/main/list.js"
import React, { useCallback } from 'react'

import { FaTrash, FaShareAlt } from 'react-icons/all'

import ServiceList from '../../services/list'

import NewTodo from './list/new-todo'

export default function List({ list, setShareList }) {
  const changeName = useCallback((e) => ServiceList.updateName(list._id, e.target.value), [list._id])
  const changeDescription = useCallback((e) => ServiceList.updateDescription(list._id, e.target.value), [list._id])

  const onListShare = useCallback(() => setShareList(list._id), [setShareList, list])
  const onListDelete = useCallback(() => ServiceList.delete(list._id), [list._id])

  const canDelete = ((list.todos || []).length < 1) && (list.isOwner)

  return (
    <div className="col col--4">
      <div className="card margin-vert--md">
        <div className="card__header" style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)", position: 'relative' }}>
          <input
            value={list.name}
            onChange={changeName}
            placeholder="Title"
            className="button button--link button--lg button--block text--left padding--xs"
          />
          <input
            value={list.description}
            onChange={changeDescription}
            placeholder="Description"
            className="button button--link button--md button--block text--left padding--xs"
          />
          <p className="padding--xs margin-bottom--md">
            {list.info.nbTotal} todo{list.info.nbTotal > 1 ? 's' : ''}
            {', '}
            {list.info.nbPending} pending
            {', '}
            {list.info.nbDone} done!
          </p>

          {
            list.isOwner && (
              <div
                className="actions row margin-horiz--xs "
                style={{ position: 'absolute', top: '1rem', right: '1rem' }}
              >
                <button
                  onClick={onListShare}
                  className="padding-horiz--xs button button--sm button--outline button--primary text--left"
                  style={{ border: 0 }}
                >
                  &nbsp;
                  <FaShareAlt />
                  &nbsp;
                  { list.sharedTo.length }
                  &nbsp;
                </button>

                <button
                  onClick={canDelete ? onListDelete : undefined}
                  className={"padding-horiz--md button button--sm button--outline button--danger text--left" + (canDelete ? '' : ' disabled')}
                  style={{ border: 0 }}
                >
                  <FaTrash />
                </button>
              </div>
            )
          }
        </div>
        <div className="card__body">
          {/* Todo: display todos */}
          <NewTodo list={list._id} />
        </div>
      </div>
    </div>
  )
}
```

We see that we use our `ServiceList` for handling modifying the `List`'s data.

We also prepared two buttons on our card: a `delete` button which only works if we
are the owner and no todo is present in the list ; and a `share` button which calls
the `setShareList` prop. We'll discuss the latter in the ['Adding panels'](/docs/guides/tutorial/client/panels) section.

## Step 4 - Using the `List` component in `main.js`

Now that we've finished the first draft of our `List` component - it is only missing the `Todo` component
which is not yet implemented - we can inject it in our `Main` component.

Simply edit the markup of our `Main` component to add the following:

```jsx title="components/main.js" {9,13,45-47}
import React, { useEffect, useState } from 'react'

import { FaPowerOff } from 'react-icons/fa'

import ServiceClient from '../services/client'
import ServiceList from '../services/list'

import NewList from './main/new-list'
import List from './main/list'

export default function Main({ logout, token }) {
  const [lists, setLists] = useState([])
  const [shareList, setShareList] = useState(null)

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
          {
            lists.map((list) => <List list={list} setShareList={setShareList} />)
          }
        </div>
      </main>
    </React.Fragment>
  )
}
``` 

Notice how we've added the `shareList` state variable, providing the required `setShareList` prop
to our `List` component. This will be used later in the ['Adding panels'](/docs/guides/tutorial/client/panels) section.

And here we have it! Our list are now displayed in our app. We can now proceed to displaying
the todos inside each list.

## Going further

Our next steps will be to create our `Todo` component, in order to show and act on todos.
