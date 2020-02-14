import React from 'react'
import { Controller } from '@harmonyjs/query'

const UserController = new Controller('user')

export default class UserRoom extends React.Component {
  state = {
    color: 'grey'
  }

  componentDidMount() {
    UserController.query
      .get()
      .select({
        color: true
      })
      .then(user => {
        this.setState({ color: user.color })
      })
  }

  updateColor = async (color) => {
    this.setState({ color })

    await UserController.mutate
      .update()
      .withId("---")
      .withContent({
        color
      })
  }

  render() {
    return (
      <div id="profile">
        <h1>User profile</h1>
        <p>
          Choose your chat bubble color
        </p>
        <br />
        <button className={"preview grey  " + (this.state.color === 'grey' ? 'selected' : '')}
          onClick={() => this.updateColor('grey')}
        />
        <button className={"preview red   " + (this.state.color === 'red' ? 'selected' : '')}
                onClick={() => this.updateColor('red')}/>
        <button className={"preview green " + (this.state.color === 'green' ? 'selected' : '')}
                onClick={() => this.updateColor('green')} />
        <button className={"preview blue  " + (this.state.color === 'blue' ? 'selected' : '')}
                onClick={() => this.updateColor('blue')} />
        <br />
      </div>
    )
  }
}
