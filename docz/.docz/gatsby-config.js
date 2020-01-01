const { mergeWith } = require('lodash/fp')
const fs = require('fs-extra')

let custom = {}
const hasGatsbyConfig = fs.existsSync('./gatsby-config.custom.js')

if (hasGatsbyConfig) {
  try {
    custom = require('./gatsby-config.custom')
  } catch (err) {
    console.error(
      `Failed to load your gatsby-config.js file : `,
      JSON.stringify(err),
    )
  }
}

const config = {
  pathPrefix: '/',

  siteMetadata: {
    title: 'Docs',
    description: 'Harmony JS docs',
  },
  plugins: [
    {
      resolve: 'gatsby-theme-docz',
      options: {
        themeConfig: {
          fonts: { monospace: 'Source Code Pro' },
          prism: {
            light: { plain: { fontFamily: 'Source Code Pro' } },
            dark: { plain: { fontFamily: 'Source Code Pro' } },
          },
        },
        themesDir: 'src',
        mdxExtensions: ['.md', '.mdx'],
        docgenConfig: {},
        menu: [
          'Introduction',
          {
            name: 'API',
            menu: [
              'About',
              '@harmonyjs/server',
              '@harmonyjs/persistence',
              '@harmonyjs/query',
              'Utils',
            ],
          },
          'Guides',
          'Plugins',
          'Contributing',
        ],
        mdPlugins: [],
        hastPlugins: [],
        ignore: [],
        typescript: false,
        ts: false,
        propsParser: true,
        'props-parser': true,
        debug: false,
        native: false,
        openBrowser: false,
        o: false,
        open: false,
        'open-browser': false,
        root: '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz',
        base: '/',
        source: './',
        src: './',
        files: '**/*.{md,markdown,mdx}',
        public: '/public',
        dest: '.docz/dist',
        d: '.docz/dist',
        editBranch: 'master',
        eb: 'master',
        'edit-branch': 'master',
        config: '',
        title: 'Docs',
        description: 'Harmony JS docs',
        host: 'localhost',
        port: 3000,
        p: 3000,
        separator: '-',
        paths: {
          root: '/home/jeremie/Workspaces/webstorm/projects/harmony/docz',
          templates:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/node_modules/docz-core/dist/templates',
          docz: '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz',
          cache:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/.cache',
          app:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app',
          appPackageJson:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/package.json',
          gatsbyConfig:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/gatsby-config.js',
          gatsbyBrowser:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/gatsby-browser.js',
          gatsbyNode:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/gatsby-node.js',
          gatsbySSR:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/gatsby-ssr.js',
          importsJs:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app/imports.js',
          rootJs:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app/root.jsx',
          indexJs:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app/index.jsx',
          indexHtml:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app/index.html',
          db:
            '/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/app/db.json',
        },
      },
    },
  ],
}

const merge = mergeWith((objValue, srcValue) => {
  if (Array.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
})

module.exports = merge(config, custom)
