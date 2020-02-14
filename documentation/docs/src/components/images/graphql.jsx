import React from 'react'
import { StaticQuery, graphql } from 'gatsby'
import Img from 'gatsby-image'

const Image = () => (
  <StaticQuery
    query={graphql`
         query {
              placeholderImage: file(relativePath: { eq: "images/graphql.png" }) {
                  childImageSharp {
                      fluid(maxWidth: 1000) {
                          ...GatsbyImageSharpFluid
                      }
                  }
              }
          }
      `}
    render={data => <Img fluid={data.placeholderImage.childImageSharp.fluid} />}
  />
)

export default Image
