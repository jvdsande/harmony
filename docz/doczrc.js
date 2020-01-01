import { css } from 'docz-plugin-css'

export default {
  plugins: [
    css(),
  ],
  menu: [
    'Introduction',
    { name: 'API', menu: ['About', '@harmonyjs/server', '@harmonyjs/persistence', '@harmonyjs/query', 'Utils'] },
    'Guides',
    'Plugins',
    'Contributing',
  ],
  themeConfig: {
    fonts: {
      monospace: 'Source Code Pro',
    },
    prism: {
      light: {
        plain: {
          fontFamily: 'Source Code Pro',
        },
      },
      dark: {
        plain: {
          fontFamily: 'Source Code Pro',
        },
      },
    },
  },
}
