// prefer default export if available
const preferDefault = m => m && m.default || m

exports.components = {
  "component---cache-dev-404-page-js": () => import("./dev-404-page.js" /* webpackChunkName: "component---cache-dev-404-page-js" */),
  "component---src-api-mdx": () => import("./../../src/api.mdx" /* webpackChunkName: "component---src-api-mdx" */),
  "component---src-index-mdx": () => import("./../../src/index.mdx" /* webpackChunkName: "component---src-index-mdx" */),
  "component---src-api-persistence-mdx": () => import("./../../src/api/persistence.mdx" /* webpackChunkName: "component---src-api-persistence-mdx" */),
  "component---src-api-server-mdx": () => import("./../../src/api/server.mdx" /* webpackChunkName: "component---src-api-server-mdx" */),
  "component---src-pages-404-js": () => import("./../src/pages/404.js" /* webpackChunkName: "component---src-pages-404-js" */)
}

