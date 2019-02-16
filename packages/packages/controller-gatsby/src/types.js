// @flow

export type ControllerGatsbyConfiguration = {
  path: string,
  dir: string,
  forceStatic?: boolean,
  hmr: {
    endpoint: string,
    port: string | number,
  },
  dynamicRoutes: ?{
    [string]: string
  }
}
