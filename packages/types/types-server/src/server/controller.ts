import { Plugin } from '@hapi/hapi'

export default class Controller {
  name: string = 'Controller'

  plugins: Plugin<any>[] = []

  config: any = null

  constructor(config) {
    this.config = config
  }

  async initialize({ server, logger }) {
    return null
  }
}
