import React from 'react'
import Scrollspy from 'react-scrollspy'
import Scroll from './Scroll'

const Nav = props => (
  <nav id="nav" className={props.sticky ? 'alt' : ''}>
    <Scrollspy items={['intro', 'step-1', 'step-2', 'step-3']} currentClassName="is-active" offset={-300}>
      <li>
        <Scroll type="id" element="intro">
          <a href="#">Introduction</a>
        </Scroll>
      </li>
      <li>
        <Scroll type="id" element="step-1">
          <a href="#">Step 1: Creating a server</a>
        </Scroll>
      </li>
      <li>
        <Scroll type="id" element="step-2">
          <a href="#">Step 2: Adding a frontend</a>
        </Scroll>
      </li>
      <li>
        <Scroll type="id" element="step-3">
          <a href="#">Step 3: Supercharging the frontend using GatsbyJS</a>
        </Scroll>
      </li>
    </Scrollspy>
  </nav>
)

export default Nav
