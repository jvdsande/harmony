export type ControllerGatsbyConfiguration = {
  path: string,
  dir: string,
  forceStatic?: boolean,
  hmr: {
    endpoint: string,
    port: string | number,
  },
  dynamicRoutes?: {
    [key: string]: string
  }
}

export const other = null
