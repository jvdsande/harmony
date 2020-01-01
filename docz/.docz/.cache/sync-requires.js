const { hot } = require("react-hot-loader/root")

// prefer default export if available
const preferDefault = m => m && m.default || m


exports.components = {
  "component---cache-dev-404-page-js": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/.cache/dev-404-page.js"))),
  "component---src-api-mdx": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/src/api.mdx"))),
  "component---src-index-mdx": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/src/index.mdx"))),
  "component---src-api-persistence-mdx": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/src/api/persistence.mdx"))),
  "component---src-api-server-mdx": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/src/api/server.mdx"))),
  "component---src-pages-404-js": hot(preferDefault(require("/home/jeremie/Workspaces/webstorm/projects/harmony/docz/.docz/src/pages/404.js")))
}

