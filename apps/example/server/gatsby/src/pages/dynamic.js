import React from 'react'
import { Router } from '@reach/router'

import Layout from '../components/layout'
import SEO from '../components/seo'

const Aware = props => (
  <div>
    {JSON.stringify(props)}
  </div>
)

const Hello = ({ name }) => (
  <div>
    Hello
    {' '}
    {name || 'World'}
!
  </div>
)

const SecondPage = () => (
  <Layout>
    <SEO title="Dynamic page" />
    <h1>This page will be dynamic</h1>
    <Router>
      <Aware path="*" />
      <Hello path="dynamic/hello" />
      <Hello path="dynamic/hello/:name" />
    </Router>
  </Layout>
)

export default SecondPage
