import React from 'react'
import Header from './components/header'

const scripts = ['vendor.js', 'app.js']

/* Create a default HTML file to be filled with React   */
/* It is also possible to pre-fill it with our App here, */
/* to benefit from Server Side Rendering                */
const App = () => (
  <html lang="en">
    <Header
      title="To-do List"
      scripts={scripts}
    />
    <body>
      <div id="root" />
    </body>
  </html>
)

module.exports = App
