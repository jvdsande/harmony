import React from 'react'
import { navigate } from '@reach/router'

export default class Header extends React.Component {
  logout = () => {
    window.localStorage.removeItem("token")
    navigate('/')
  }

  render() {
    return (
      <div id="header">
        <button onClick={this.logout}>Logout</button>
      </div>
    )
  }
}
