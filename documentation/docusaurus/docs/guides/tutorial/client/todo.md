---
title: Creating the Todo component
sidebar_label: Creating the Todo component
---

Creating our `Todo` component will be really quick, as we've layed all the foundation
necessary for it.

## Step 1 - Create the `Todo` component

As usual we'll start by creating the file:

```shell script
touch src/components/main/list/todo.js
```

And then fill it with the following markup:

```jsx title="components/main/list/todo.js"
import React, { useCallback } from 'react'

import { FaCheckCircle, FaInfoCircle, FaRegCircle, FaTrash } from 'react-icons/all'

import ServiceTodo from '../../../services/todo.js'

export default function Todo({ todo, list, setCommentsTodo }) {
  const onToggleTodo = useCallback(() => ServiceTodo.toggle(todo, list), [todo, list])
  const onDeleteTodo = useCallback(() => ServiceTodo.delete(todo), [todo])
  const onCommentsTodo = useCallback(() => setCommentsTodo(todo._id), [todo, setCommentsTodo])

  return (
    <div className="row row--align-center padding-horiz--md">
      <button
        onClick={onToggleTodo}
        className="row row--align-center margin-right--xs padding-horiz--md button button--secondary button--outline text--left text--truncate"
        style={{ border: 0, marginLeft: '0.05rem', flex: 1 }}
      >
        { todo.status ? <FaCheckCircle className="text--primary margin-right--xs" /> : <FaRegCircle className="text--primary margin-right--xs" /> }
        <span
          className={"margin-left--xs text--truncate" + (todo.status ? ' text--primary' : '')}
          style={{
            textDecoration: todo.status ? 'line-through' : 'none'
          }}
        >
          { todo.description }
        </span>
      </button>
      <div className="row padding-horiz--md" style={{ flex: "none" }}>
        <button
          onClick={onCommentsTodo}
          className="margin-horiz--xs padding-horiz--md button button--sm button--outline button--secondary text--left"
          style={{ border: 0, marginLeft: '0.05rem' }}
        >
          <FaInfoCircle />
        </button>
        <button
          onClick={onDeleteTodo}
          className="margin-horiz--xs padding-horiz--md button button--sm button--outline button--danger text--left"
          style={{ border: 0, marginLeft: '0.05rem' }}
        >
          <FaTrash />
        </button>
      </div>
    </div>
  )
}
```

We're using a FontAwesome icon for showing the toggled state, a simple span for the description,
and we've added two buttons: one for deleting the todo, and one for opening a comments panel, using
the `setCommentsTodo` prop. This will be used later in the ['Adding panels'](/docs/guides/tutorial/client/panels) section.

## Step 2 - Editing our `List` component

Now that we have our `Todo` component, we can add it to our `List` component by applying the following
modifications:

```jsx title="components/main/list.js" {8,10,73-75}
import React, { useCallback } from 'react'

import { FaTrash, FaShareAlt } from 'react-icons/all'

import ServiceList from '../../services/list'

import NewTodo from './list/new-todo'
import Todo from './list/todo'

export default function List({ list, setShareList, setCommentsTodo }) {
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
          <p className="padding--xs">
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
          {
            (list.todos || []).map((todo) => (<Todo key={todo._id} todo={todo} list={list._id} setCommentsTodo={setCommentsTodo} />))
          }
          <NewTodo list={list._id} />
        </div>
      </div>
    </div>
  )
}
```

Notice how we added the `setCommentsTodo` prop to our `List` component, passing it down
to our `Todo` component. As for `setShareList`, this prop will be the responsibility of
`Main`.

## Step 3 - Modifying the `Main` component

We now need to create the `setCommentsTodo` function in our `Main` component. This will
be a state mutating function, as follows:

```jsx title="components/main.js" {14,47}
import React, { useEffect, useState } from 'react'

import { FaPowerOff } from 'react-icons/fa'

import ServiceClient from '../services/client'
import ServiceList from '../services/list'

import NewList from './main/new-list'
import List from './main/list'

export default function Main({ logout, token }) {
  const [lists, setLists] = useState([])
  const [shareList, setShareList] = useState(null)
  const [commentsTodo, setCommentsTodo] = useState(null)

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
            lists.map((list) => <List list={list} setShareList={setShareList} setCommentsTodo={setCommentsTodo} />)
          }
        </div>
      </main>
    </React.Fragment>
  )
}
```

And this concludes the `Todo` component addition!

We now have a working todo-list app complete with server-integration. We can create, edit
and delete list, create, toggle and delete todos.

## Next steps

We will now add two more features to make our app complete: a "share panel" for lists allowing
a user to share their list with others, and a "comments panel" for todo allowing users
to comment on a todo.
