import Logger from '@harmonyjs/logger'

function getPluginsFromController({
  controller,
  registeredPlugins,
  pluginsToRegister,
}) {
  if (controller.plugins && controller.plugins.length) {
    controller.plugins.forEach((plugin) => {
      let name = null

      // Check if the plugin is using the ".plugin" definition
      if (plugin.plugin) {
        // If it is, check if we are embedding it in a plugin/options object
        if (plugin.plugin.plugin) {
          name = plugin.plugin.plugin.pkg.name
        } else {
          name = plugin.plugin.pkg.name
        }
      } else {
        name = plugin.pkg.name
      }

      if (registeredPlugins.indexOf(name) < 0) {
        pluginsToRegister.push(plugin)
        registeredPlugins.push(name)
      }
    })
  }
}

export function getPluginsFromControllers({ controllers }) {
  const registeredPlugins = []
  const pluginsToRegister = []

  function getPlugins(controller) {
    return getPluginsFromController({ controller, registeredPlugins, pluginsToRegister })
  }

  controllers.forEach(getPlugins)

  return pluginsToRegister
}

export async function registerPlugins({ plugins, server }) {
  await Promise.all(plugins.map(async (p) => {
    await server.register(p)
  }))
}

export async function registerControllers({
  controllers, server, log, logConfig,
}) {
  await Promise.all(controllers.map(async (c, i) => {
    const plugin = {
      name: `harmonyjs-${i}`,
      register: async () => {
        const logger = new Logger(c.name, logConfig)
        logger.level = log.level
        await c.initialize({ server, logger })
      },
    }

    await server.register(plugin)
  }))
}
