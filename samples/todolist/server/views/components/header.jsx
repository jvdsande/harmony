import React from 'react'
import PropTypes from 'prop-types'

module.exports = class Header extends React.Component {
  static propTypes = {
    fonts: PropTypes.arrayOf(PropTypes.string),
    scripts: PropTypes.arrayOf(PropTypes.string),
    title: PropTypes.string.isRequired,
  }

  static defaultProps = {
    fonts: [],
    scripts: [],
  }

  render() {
    const { fonts, title, scripts } = this.props

    const fontFamilies = fonts.join('|')

    return (
      <head>
        <base href="/" />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=320, initial-scale=1.0, user-scalable=no" />

        {
          fontFamilies !== '' && (
            <link href={`https://fonts.googleapis.com/css?family=${fontFamilies}`} rel="stylesheet" />
          )
        }

        <title>{title}</title>

        {
          scripts.map(script => <script src={`public/${script}`} key={script} />)
        }
      </head>
    )
  }
}
