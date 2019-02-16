const path = require('path')
const { DllReferencePlugin, ProvidePlugin } = require('webpack')

const manifest = require('./vendor.json')


const addresses = {
  webpack: {
    host: '127.0.0.1',
    port: '8090',
    path: '/public',
  },
}

/* Address at which to provide webpack bundle and HMR diff in development */
const WEBPACK_DEV_ADDRESS = addresses.webpack.host
const WEBPACK_DEV_PORT = addresses.webpack.port
const WEBPACK_DEV_PATH = addresses.webpack.path

// NOTE: complete dev address will be "http://{WEBPACK_DEV_ADDRESS}:{WEBPACK_DEV_PORT}{WEBPACK_DEV_PATH}"


/* You can change the base loader "style-loader" to a file extractor in case you want a separate CSS bundle */
const CSS_LOADER = ['style-loader', 'css-loader']
const SCSS_LOADER = [...CSS_LOADER, 'sass-loader']

module.exports = (e) => {
  const env = e || {}

  /* Common parameters */
  const entry = {
    /* Configure your entry points. Each entry point will result in a "build/[name].js" bundle */
    app: './client/index.jsx',
  }

  const output = {
    filename: '[name].js',
    path: path.resolve(__dirname, 'build'),
    publicPath: 'public/',
  }

  const plugins = [
    new ProvidePlugin({
      React: 'react',
      PropTypes: 'prop-types',
      RouterPropTypes: 'react-router-prop-types',
      bind: ['bind-decorator', 'bind'],
    }),
  ]

  const module = {
    rules:
        [
          // Inline CSS
          {
            test: /\.css/,
            use: CSS_LOADER,
          },

          // Inline SASS
          {
            test: /\.scss$/,
            use: SCSS_LOADER,
          },

          // Inline fonts in CSS/SCSS files
          {
            test: /\.(svg|ttf|eot|woff|woff2)(\?[a-z0-9#=&.]+)?$/,
            use: {
              loader: 'url-loader',
              options: {
                limit: 8192,
                name: '[name].[ext]',
                publicPath: '/spa/public',
              },
            },
          },
        ],
  }

  const resolve = {
    mainFields: ['browser', 'main', 'module'],
    extensions: ['.jsx', '.js', '.json'],
    alias: {
      app: path.resolve(__dirname, 'client/app'),
      login: path.resolve(__dirname, 'client/login'),
      shared: path.resolve(__dirname, 'client/shared'),
    },
  }

  const optimization = {}

  let watchOptions = {}

  let devServer = {}


  if (env && env.production) {
    /* Production specific configuration */

    /* Modify any configuration object here for production specific cases */

    /* Add your Webpack plugins here */
    plugins.push(new DllReferencePlugin({
      context: process.cwd(),
      manifest,
    }))

    /* Add rule for JSX without HMR in production */
    module.rules.push({
      test: /\.jsx?$/,
      use: [{
        loader: 'babel-loader',
      }],
    })
  } else {
    /* Development specific configuration */

    /* Modify any configuration object here for development specific cases */

    /* In development, we watch the files */
    watchOptions = {
      aggregateTimeout: 500,
      poll: 500,
      ignored: /node_modules/,
    }

    /* In development, we use a development server for hot reloading */
    devServer = {
      contentBase: path.resolve(__dirname, './build'),
      host: WEBPACK_DEV_ADDRESS,
      port: WEBPACK_DEV_PORT,
      disableHostCheck: true,
      overlay: true,
      headers:
      {
        'Access-Control-Allow-Origin': '*',
      },
    }

    /* Add rule for JSX with HMR in development */
    module.rules.push({
      test: /\.jsx?$/,
      use: [
        {
          loader: 'babel-loader',
          options: {
            plugins: [
              [
                'react-hot-loader/babel',
              ],
            ],
          },
        }],
    })
  }

  /* Return the configured object */
  return {
    entry,
    output,
    resolve,
    plugins,
    module,
    optimization,
    watchOptions,
    devServer,
  }
}
