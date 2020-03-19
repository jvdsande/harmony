import { css } from 'docz-plugin-css'

export default {
  plugins: [
    css(),
  ],
  menu: [
    'Introduction',
    { name: 'API', menu: ['About', '@harmonyjs/server', '@harmonyjs/persistence', '@harmonyjs/query', '@harmonyjs/logger'] },
    'Guides',
    'Plugins',
    'Contributing',
  ],
  themeConfig: {
    fonts: {
      monospace: 'Source Code Pro',
    },
    header: {
      bg: '#C12C18'
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
