---
title: Creating the Share and Details panels
sidebar_label: Creating the Share and Details panels
---

At this point, we have a working todo-list application, allowing users to authenticate,
create several lists, fill them with todos and toggle their todos on and off.

But our API is capable of more than that: it allows _sharing lists_ between users, and 
_commenting on todos_. Let's add those functionalities to our client!

## Step 1 - Creating the `PanelShare` component

This first component will be used to see which users have access to our list, and share it
with a new user.

In terms of services, we already have everything we need: the `ServiceList` service already
provides us with a `share` request, and the `fetchAll` request selects the `sharedTo` information.

We just need to create the file and fill the markup:

```shell script
touch src/components/main/panel-share.js
```

```jsx title="components/main/panel-share.js"
import React, { useState, useCallback } from 'react'

import ServiceList from '../../services/list'

export default function PanelShare({ list }) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const onCardClick = useCallback((e) => e.stopPropagation(), [])
  const onEmailChange = useCallback((e) => setEmail(e.target.value), [])
  const onListShare = useCallback(async (e) => {
    e.preventDefault()

    if(email) {
      setEmail('')
      setError('')
      setSuccess('')
      try {
        await ServiceList.share(list._id, email)

        setSuccess(email)
      } catch(err) {
        setError(email)
      }
    }
  }, [list, email])

  return (
    <div onClick={onCardClick} className="card" style={{ position: "relative", top: "10rem", maxWidth: "40rem", margin: "auto" }}>
      <div className="card__header text--left padding-bottom--md" style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)", position: 'relative' }}>
        <span className="text--bold text--primary">{list.name}</span>
        <br />
        <span className="text--semibold text--primary" style={{ fontSize: "0.8em"}}>{list.description}</span>
        <br />
      </div>
      <div className="card__body">
        <form onSubmit={onListShare} className="row row--align-center margin-horiz--md">
          <div className="col col--8">
            <input value={email} onChange={onEmailChange} className="button button--block button--outline button--primary text--left" />
          </div>
          <div className="col col--4">
            <button type="submit" onClick={onListShare} className="button button--block button--primary">
              Share
            </button>
          </div>
        </form>

        {
          error && (
            <div className="alert alert--danger margin-top--md">
              No user with email {error}
            </div>
          )
        }

        {
          success && (
            <div className="alert alert--success margin-top--md">
             Successfully shared with {success}
            </div>
          )
        }

        <p className="text--bold text--left margin-top--md">Shared with:</p>
        <p className="padding-horiz--md">
          {
            (list.sharedTo || []).length ? (
              list.sharedTo.map(user => (<p key={user._id} className="text--primary text--left text--bold">{user.email}</p>))
            ) : (
              <p className="alert alert--secondary">
                No one
              </p>
            )
          }
        </p>
      </div>
    </div>
  )
}
```

It uses a simple form for handling the sharing to a new user, with error or success display
when submitting.


## Step 2 - Creating the `PanelComments` component

This second panel component will be used to display comments on a todo, and allow users
to add a new comment to the ongoing conversation.

This panel is a bit more involved than the previous one, since it needs to handle a new subscription:
fetching the comments when the panel is displayed.

Fetching comments and adding a new comment are two tasks already available from our `TodoService`,
respectively through the `fetchComments` and the `comment` requests.

Finally, all that is left to do is create our markup and state logic. Here, we'll have a list
of previously added comment, and a form to create a new one.

Let's start by creating the file:

```shell script
touch src/components/main/panel-comments.js
```

And fill it with the following markup:

```jsx title="components/main/panel-comments.js"
import React, { useState, useEffect, useCallback, useMemo } from 'react'

import ServiceTodo from '../../services/todo'

export default function PanelComments({ todo, list }) {
  const [loading,setLoading] = useState(true)
  const [comments,setComments] = useState([])
  const [comment,setComment] = useState('')

  const todoInfo = useMemo(() => list.todos.find(t => t._id === todo), [todo, list])

  const commentsCallback = useCallback((comments) => {
    setComments(comments)
    setLoading(false)
  }, [])

  const onCardClick = useCallback((e) => e.stopPropagation(), [])
  const onChangeComment = useCallback((e) => setComment(e.target.value), [])
  const onSubmitComment = useCallback(async (e) => {
    e.preventDefault()

    if(comment) {
      await ServiceTodo.comment(todo, comment)
    }

    setComment('')
  }, [todo, comment])

  const renderComment = useCallback((c) => (
    <div className="alert alert--secondary text--left text--normal margin--xs">
      <div className="text--bold">
        <span>{c.author.email}:</span>
        <span className="text--italic text--primary" style={{ float: 'right', fontSize: '0.8em' }}>
          {new Date(c.date).toLocaleString()}
        </span>
      </div>
      <div>{c.content}</div>
    </div>
  ), [])

  useEffect(() => {
    setLoading(true)

    const subscription = ServiceTodo.fetchComments(todo)
      .subscribe(commentsCallback)

    return () => subscription.unsubscribe(commentsCallback)
  }, [todo, commentsCallback])

  return (
    <div onClick={onCardClick} className="card" style={{ position: "relative", top: "10rem", maxWidth: "40rem", margin: "auto" }}>
      <div className="card__header text--left padding-bottom--md" style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)", position: 'relative' }}>
        <span className="text--bold text--primary">{list.name}</span>
        <br />
        <span className="text--semibold text--primary" style={{ fontSize: "0.8em"}}>{list.description}</span>
        <br />
      </div>
      <div className="card__header text--left padding-bottom--md" style={{ borderBottom: "1px solid rgba(0, 0, 0, 0.1)", position: 'relative' }}>
        <span className="text--semibold text--primary text--bold">{todoInfo.description}</span>
        <br />
      </div>
      <div className="card__body">
        {
          loading ? (
            <div className="alert alert--secondary">
              Loading...
            </div>
          ) : (
            <div>
              {
                comments.length ? (
                  comments.map(renderComment)
                ) : (
                  <div className="alert alert--secondary">
                    No comment yet
                  </div>
                )
              }

              <form onSubmit={onSubmitComment} className="row row--align-center padding-horiz--md margin-top--md">
                <div className="col col--8 margin-vert--xs">
                  <input value={comment} onChange={onChangeComment} className="button button--block button--primary button--outline text--left" />
                </div>
                <div className="col col--4 margin-vert--xs">
                  <button type="submit" onClick={onSubmitComment} className="button button--block button--primary">
                    Send
                  </button>
                </div>
              </form>
            </div>
          )
        }
      </div>
    </div>
  )
}
```

And there we have it: the ability to comment on todos!

We now need to update our `Main` component to actually _use_ those two components we just made.

## Step 3 - Injecting our panels in `Main`

It is now time to complete our `Main` component, by adding the logic necessary to display
our panels.

Most of the work has already be done through the `setShareList` and `setCommentsTodo` state functions.

We just need a few extra steps to retrieve the concerned list, and display our panels:

```jsx title="components/main.js" {10-12,18-23,60-83}
import React, { useEffect, useState, useCallback, useMemo } from 'react'

import { FaPowerOff } from 'react-icons/fa'

import ServiceClient from '../services/client'
import ServiceList from '../services/list'

import NewList from './main/new-list'
import List from './main/list'

import PanelShare from './main/panel-share'
import PanelComments from './main/panel-comments'

export default function Main({ logout, token }) {
  const [lists, setLists] = useState([])
  const [shareList, setShareList] = useState(null)
  const [commentsTodo, setCommentsTodo] = useState(null)

  const listForPanelShare = useMemo(() => lists.find(l => l._id === shareList), [lists, shareList])
  const listForPanelComments = useMemo(() => lists.find(l => l.todos.find(t => t._id === commentsTodo)), [lists, commentsTodo])

  const onCloseShare = useCallback(() => setShareList(null), [])
  const onCloseComments = useCallback(() => setCommentsTodo(null), [])

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

      {
        listForPanelShare && (
          <div
            className="backdrop"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", textAlign: "center" }}
            onClick={onCloseShare}
          >
            <PanelShare list={listForPanelShare} />
          </div>
        )
      }

      {
        listForPanelComments && (
          <div
            className="backdrop"
            style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", textAlign: "center" }}
            onClick={onCloseComments}
          >
            <PanelComments list={listForPanelComments} todo={commentsTodo} />
          </div>
        )
      }
    </React.Fragment>
  )
}
```

And this is it!

Our todo-list application, supercharged with sharing and comments features, is now complete!

This concludes the HarmonyJS tutorial - hopefully we showcased how easy it is to build complex,
reactive applications using a data-centric approach.

You have now acquired all the basics to start using HarmonyJS for your next project. If you
have any other question about how the framework works, head over to our [Cheat Sheets](/docs/guides/cheatsheets/introduction),
a collection of quick-yet-complete reminders about all key features, for both server and client.

And if you're feeling adventurous, dive into the [Plugins](/docs/plugins) documentation to learn
how to create your own `Controller`s or `Adapter`s, thus infinitely extending HarmonyJS's capacities!
