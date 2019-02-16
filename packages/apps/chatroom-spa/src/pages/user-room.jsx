import React from 'react'
import Chatbox from '../components/chatbox'

export default class UserRoom extends React.Component {
  render() {
    const { '*': users} = this.props
    return (
      <Chatbox users={users.split('/')}/>
    )
  }
}
