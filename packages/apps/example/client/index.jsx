// @flow

import React from 'react'
import ReactDOM from 'react-dom'
// import { hot } from 'react-hot-loader'

import { store, collect } from 'react-recollect'

import _ from 'lodash'

import Query, { Controller } from '@harmonyjs/query'

import './style.scss'

Query.configure()

const ListController = new Controller('list')
const TaskController = new Controller('task')


type ListElement = {
  _id: string,
  name: string,
  description: string,
  numberOfTasks: number,
  numberOfDone: number,
}

type TaskElement = {
  _id: string,
  name: string,
  done: boolean,
  list: {
    _id: string,
  },
}

const listSubscribe = ListController.query
  .list()
  .select({
    _id: true,
    name: true,
    numberOfTasks: true,
    numberOfDone: true,
    description: true,
  })
  .subscribe((lists: Array<ListElement>) => {
    store.lists = lists
  }, ['task'])

TaskController.query
  .list()
  .select({
    _id: true,
    name: true,
    done: true,
    list: {
      _id: true,
    },
  })
  .subscribe((tasks: Array<TaskElement>) => {
    store.tasks = tasks
  })

store.inputs = {}

const Input = collect(({ value }) => (
  <input
    type="text"
    value={store.inputs[value] || ''}
    onChange={(e) => { store.inputs[value] = e.target.value }}
  />
))

class _Task extends React.Component<{
  task: TaskElement
}> {
  updateTask = _.debounce(async () => {
    const { task } = this.props
    await TaskController.mutate.update().withId(task._id).withContent({ name: task.name })
  }, 500)

  render() {
    const { task } = this.props
    return (
      <div className={`task ${task.done ? 'done' : ''}`}>
        <input
          type="checkbox"
          checked={task.done}
          onChange={async (e) => {
            await TaskController.mutate
              .update()
              .withId(task._id)
              .withContent({
                done: e.target.checked,
              })
          }}
        />
        <input
          type="text"
          value={task.name}
          onChange={async (e) => {
            task.name = e.target.value
            this.updateTask()
          }}
        />
        <button className="delete" type="button" onClick={async () => { await TaskController.mutate.delete().withId(task._id) }}>
          X
        </button>
      </div>
    )
  }
}

const Task = collect(_Task)

class _List extends React.Component<{
  list: ListElement
}> {
  updateList = _.debounce(async () => {
    const { list } = this.props
    await ListController.mutate.update().withId(list._id).withContent({ description: list.description, name: list.name })
  }, 500)

  render() {
    const { list } = this.props
    return (
      <div className="list">
        <button className="delete" type="button" onClick={async () => { await ListController.mutate.delete().withId(list._id) }}>
          X
        </button>
        <h1>
          <input
            type="text"
            value={list.name}
            onChange={async (e) => {
              list.name = e.target.value
              this.updateList()
            }}
          />
          {' '}
          (
          {list.numberOfDone}
          /
          {list.numberOfTasks}
          )
        </h1>
        <input
          type="text"
          className={`description${!list.description ? ' empty' : ''}`}
          value={list.description}
          placeholder="Add a description"
          onChange={async (e) => {
            list.description = e.target.value
            this.updateList()
          }}
        />
        <div className="tasks">
          {
            store.tasks && store.tasks.filter(task => task.list._id === list._id).map(task => <Task key={task._id} task={task} />)
          }
        </div>
        <div className="new">
          <Input value={`newTask${list._id}`} />
          <button
            type="button"
            onClick={async () => {
              await TaskController.mutate
                .create()
                .withContent({
                  name: store.inputs[`newTask${list._id}`],
                  list: list._id,
                })

              store.inputs[`newTask${list._id}`] = ''
            }}
          >
            Create Task
          </button>
        </div>
      </div>
    )
  }
}

const List = collect(_List)

class _App extends React.Component<void> {
  render() {
    return (
      <div className="container">
        <h1>
          My To-do lists
        </h1>
        <div className="lists">
          {
            store.lists && store.lists.map(list => <List key={list._id} list={list} />)
          }
        </div>
        <div className="config">
          <div className="new">
            <Input value="newList" />
            <button
              type="button"
              onClick={async () => {
                await ListController.mutate
                  .create()
                  .withContent({
                    name: store.inputs.newList,
                  })

                store.inputs.newList = ''
              }}
            >
              Create List
            </button>
          </div>
          <div className="check">
            <input
              type="checkbox"
              id="listen"
              defaultChecked
              onChange={((e) => {
                if (e.target.checked) {
                  listSubscribe.listen('task')
                } else {
                  listSubscribe.listen()
                }
              })}
            />
            <label htmlFor="listen">Listen to tasks</label>
          </div>
          <div className="check">
            <input
              type="checkbox"
              id="onlyOne"
              onChange={((e) => {
                if (e.target.checked) {
                  listSubscribe.limit(1)
                } else {
                  listSubscribe.limit()
                }
              })}
            />
            <label htmlFor="onlyOne">Only one</label>
          </div>
        </div>
      </div>
    )
  }
}

const App = collect(_App)


const HotReloadApp = App // hot(module)(App)

const MainApp = () => {
  const element = document.getElementById('root')

  if (element) {
    ReactDOM.render(<HotReloadApp />, element)
  }
}

document.addEventListener('DOMContentLoaded', MainApp)
