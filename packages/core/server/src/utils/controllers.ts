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
  await Promise.all(plugins.map(async (p) => server.register(p)))
}

export async function registerControllers({ controllers, server, log }) {
  await Promise.all(controllers.map((c, i) => {
    const plugin = {
      name: `harmonyjs-${i}`,
      register: () => c.initialize({ server, log }),
    }

    return server.register(plugin)
  }))
}
