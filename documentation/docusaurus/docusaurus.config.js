module.exports = {
  title: 'HarmonyJS',
  tagline: 'A JavaScript framework for building next-generation websites and applications',
  url: 'https://harmonyjs.io',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.
  stylesheets: ['https://fonts.googleapis.com/css2?family=Source+Code+Pro&family=Source+Sans+Pro&display=swap'],
  themeConfig: {
    navbar: {
      title: 'HarmonyJS',
      logo: {
        alt: 'HarmonyJS',
        src: 'img/logo.svg'
      },
      links: [
        {
          to: 'docs/guides',
          activeBasePath: 'docs/guides',
          label: 'Guides',
          position: 'left',
        },
        {
          to: 'docs/api',
          activeBasePath: 'docs/api',
          label: 'API Reference',
          position: 'left',
        },
        {
          href: 'https://github.com/jvdsande/harmony',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      copyright: `Copyright © ${new Date().getFullYear()} HarmonyJS`,
    },
    prism: {
      theme: require('prism-react-renderer/themes/github'),
      darkTheme: require('prism-react-renderer/themes/vsDark')
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
};
