module.exports = {
  plugins: [
    { resolve: 'gatsby-plugin-sass' },
    {
      resolve: 'gatsby-plugin-prefetch-google-fonts',
      options: {
        fonts: [
          {
            family: 'Source Code Pro',
            variants: ['400'],
          }
        ]
      }
    }
  ]
}
