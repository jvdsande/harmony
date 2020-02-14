const { DllPlugin } = require('webpack')
const path = require('path')

const BUILD_DIR = path.resolve(__dirname, 'build')
const ROOT_DIR = path.resolve(__dirname)

module.exports = {
  context: process.cwd(),

  entry: {
    vendor: [
      'react',
      'react-dom',
      'mobx',
      'mobx-react',
      'prop-types',
    ],
  },

  output: {
    filename: '[name].js',
    path: BUILD_DIR,
    library: '[name]',
  },

  plugins: [
    new DllPlugin({
      name: '[name]',
      path: path.join(ROOT_DIR, '[name].json'),
    }),
  ],
}
