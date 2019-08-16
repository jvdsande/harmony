import React from 'react'
import { Controller } from '@harmonyjs/query'

const RoomController = new Controller('room')
const MessageController = new Controller('message')
const TypingController = new Controller('typing')

export default class Chatbox extends React.Component {
  state = {
    messages: [],
    message: '',
    room: null,
    typing: [],
  }

  componentDidMount() {
    this.retrieveRoomAndMessages()
  }

  retrieveRoomAndMessages = async () => {
    const { users } = this.props

    let room = null
    if(users) {
      room = await RoomController.query
        .get()
        .where({
          usernames: this.props.users,
        })
        .select({
          _id: true,
        })
    }

    this.setState({ room })

    MessageController.query
      .list()
      .where({
        room: room ? room._id : null,
      })
      .select({
        author: {
          displayName: true,
          color: true,
        },
        content: true,
        timestamp: true,
      })
      .subscribe((messages) => {
        this.setState({ messages })
        this.messages.scrollTo(0, this.messages.scrollHeight)
      })


    const prepareTypingQuery = () => ({
      room: room ? room._id : null,
      _operators: {
        timestamp: {
          gte: (new Date()).valueOf() - 500 // 500ms ago
        }
      }
    })

    const typingSubscription = TypingController.query
      .list()
      .where({
        ...prepareTypingQuery()
      })
      .select({
        user: {
          displayName: true,
        }
      })


    typingSubscription.subscribe((typing) => {
      this.setState({ typing })

      typingSubscription.where({
        ...prepareTypingQuery()
      })

      window.clearTimeout(this.typingTimeout)

      if(typing.length) {
        this.typingTimeout = window.setTimeout(() => {
          typingSubscription.where({
            ...prepareTypingQuery()
          })
        }, 500)
      }
    })
  }

  handleMessageUpdate = (e) => {
    const typingContent = {}

    if(this.state.room && this.state.room._id) {
      typingContent.room = this.state.room._id
    }

    TypingController.mutate
      .create()
      .withContent(typingContent)
      .then(() => {})

    this.setState({
      message: e.target.value
    })
  }

  sendMessage = async (e) => {
    e.preventDefault()

    const content = {
      content: this.state.message,
    }

    if(this.state.room && this.state.room._id) {
      content.room = this.state.room._id
    }

    await MessageController.mutate
      .create()
      .withContent(content)

    this.setState({
      message: ''
    })
  }

  render() {
    const { users } = this.props

    return (
      <div id="chatbox">
        <h1>
          Chatbox with {this.props.users ? users.join(', ') : 'everyone' }
        </h1>

        <div id="messages" ref={r => this.messages = r}>
          {
            this.state.messages.map(message => {
              const { content, author, timestamp } = message

              return (
                <div className={"message " + author.color}>
                  <h2 className="author">{author.displayName}</h2>
                  <p className="content">{content}</p>
                  <p className="date">{new Date(timestamp).toLocaleDateString()} - {new Date(timestamp).toLocaleTimeString()}</p>
                </div>
              )
            })
          }
        </div>

        <div id="typing">
          {this.state.typing.length ? (
            'Typing: ' + this.state.typing.map(t => t.user.displayName).join(',')
          ) : ''}
        </div>

        <form onSubmit={this.sendMessage} id="form">
          <input
            type="text"
            value={this.state.message}
            onChange={this.handleMessageUpdate}
          />
          <button type="submit">Send</button>
        </form>
      </div>
    )
  }
}
