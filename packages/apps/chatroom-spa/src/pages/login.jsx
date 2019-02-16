import React from 'react'
import Query from '@foundationjs/query'
import { navigate } from '@reach/router'

export default class Login extends React.Component {
  state = {
    username: ''
  }

  onSubmit = (e) => {
    e.preventDefault()

    if(this.state.username.trim() !== '') {
      Query.query({
        login: {
          args: {
            username: this.state.username
          },
        }
      }).then(({ login: token }) => {
        Query.configure({ token })
        window.localStorage.setItem('token', token)
        navigate('/chat')
      })
    }
  }

  handleUsernameChange = (e) => {
    this.setState({
      username: e.target.value
    })
  }

  render() {
    return (
      <div id="login">
        <form onSubmit={this.onSubmit}>
          <label htmlFor="username">Username:</label>
          <input type="text" name="username" value={this.state.username} onChange={this.handleUsernameChange} />
          <button type="submit">Login</button>
        </form>
      </div>
    )
  }
}
