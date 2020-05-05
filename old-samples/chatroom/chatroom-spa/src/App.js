import React from 'react';
import { Router, navigate } from '@reach/router'
import Query from '@harmonyjs/query'

import './App.css'

import Login from './pages/login'
import GlobalRoom from './pages/global-room'
import UserRoom from './pages/user-room'
import UserProfile from './pages/user-profile'

import Header from './components/header'


class App extends React.Component {
  constructor() {
    super()

    // Check if the token is available in local storage
    const token = window.localStorage.getItem('token')

    Query.configure({
      token,
      endpoint: {
        host: "http://localhost",
        port: 8888,
      },
      path: {
        graphql: "/graphql"
      },
    })

    if(token) {
      if(!window.location.pathname.startsWith('/chat')) {
        navigate('/chat')
      }
    } else {
      navigate('/')
    }
  }

  render() {
    return (
      <div className="App">
        <Router id="header-container">
          <Header path="/chat/*" />
        </Router>
        <Router>
          <Login default />
          <GlobalRoom path="/chat" />
          <UserRoom path="/chat/*" />
          <UserProfile path="/chat/profile" />
        </Router>
      </div>
    );
  }
}

export default () =>  (
  <App default />
)
