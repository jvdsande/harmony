import React from 'react'
import Helmet from 'react-helmet'

import Layout from '../components/layout'
import HeaderGeneric from '../components/HeaderGeneric'
import pic04 from '../assets/images/pic04.jpg'

class Generic extends React.Component {
  render() {
    return (
      <Layout>
        <Helmet title="API Reference" />
        <HeaderGeneric
          title="API Reference"
          description="Reference of the complete Foundation Framework API"
        />
        <div id="main">
          <section id="content" className="main">
            <h2>Work in progress...</h2>
          </section>
        </div>
      </Layout>
    )
  }
}

export default Generic
