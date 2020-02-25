import React from 'react'
import ReactDOM from 'react-dom'

import { store, collect } from 'react-recollect'

import _ from 'lodash'

import Query, { Accessor } from '@harmonyjs/query'

import './style.scss'

Query.configure()

const ListAccessor = new Accessor('list')
const TaskAccessor = new Accessor('task')

const listSubscribe = ListAccessor.query
  .list
  .select({
    _id: true,
    name: true,
    numberOfTasks: true,
    numberOfDone: true,
    description: true,
  })
  .listen('task')
  .subscribe((lists) => {
    store.lists = lists
  })

TaskAccessor.query
  .list
  .select({
    _id: true,
    name: true,
    done: true,
    list: {
      _id: true,
    },
  })
  .subscribe((tasks) => {
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

const _Task = ({ task }) => {
  const updateTask = React.useMemo(() => _.debounce(async () => {
    await TaskAccessor.mutate.update.withId(task._id).withRecord({ name: task.name })
  }, 500), [task])

  return (
    <div className={`task ${task.done ? 'done' : ''}`}>
      <input
        type="checkbox"
        checked={task.done}
        onChange={async (e) => {
          await TaskAccessor.mutate
            .update
            .withId(task._id)
            .withRecord({
              done: e.target.checked,
            })
        }}
      />
      <input
        type="text"
        value={task.name}
        onChange={async (e) => {
          // eslint-disable-next-line no-param-reassign
          task.name = e.target.value
          updateTask()
        }}
      />
      <button
        className="delete"
        type="button"
        onClick={async () => { await TaskAccessor.mutate.delete.withId(task._id) }}
      >
        X
      </button>
    </div>
  )
}
_Task.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  task: PropTypes.object.isRequired,
}

const Task = collect(_Task)


const _List = ({ list }) => {
  const updateList = React.useMemo(() => _.debounce(async () => {
    await ListAccessor.mutate.update.withId(list._id).withRecord({ description: list.description, name: list.name })
  }, 500), [list])

  return (
    <div className="list">
      <button
        className="delete"
        type="button"
        onClick={async () => { await ListAccessor.mutate.delete.withId(list._id) }}
      >
        X
      </button>
      <h1>
        <input
          type="text"
          value={list.name}
          onChange={async (e) => {
            // eslint-disable-next-line no-param-reassign
            list.name = e.target.value
            updateList()
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
          // eslint-disable-next-line no-param-reassign
          list.description = e.target.value
          updateList()
        }}
      />
      <div className="tasks">
        {
          store.tasks && store.tasks
            .filter((task) => task.list._id === list._id)
            .map((task) => <Task key={task._id} task={task} />)
        }
      </div>
      <div className="new">
        <Input value={`newTask${list._id}`} />
        <button
          type="button"
          onClick={async () => {
            await TaskAccessor.mutate
              .create
              .withRecord({
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
_List.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  list: PropTypes.object.isRequired,
}

const List = collect(_List)


const _App = () => (
  <div className="container">
    <h1>
      My To-do lists
    </h1>
    <div className="lists">
      {
        store.lists && store.lists.map((list) => <List key={list._id} list={list} />)
      }
    </div>
    <div className="config">
      <div className="new">
        <Input value="newList" />
        <button
          type="button"
          onClick={async () => {
            await ListAccessor.mutate
              .create
              .withRecord({
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
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
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
        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
        <label htmlFor="onlyOne">Only one</label>
      </div>
    </div>
  </div>
)

const App = collect(_App)


const HotReloadApp = App // hot(module)(App)

const MainApp = () => {
  const element = document.getElementById('root')

  if (element) {
    ReactDOM.render(<HotReloadApp />, element)
  }
}

document.addEventListener('DOMContentLoaded', MainApp)
