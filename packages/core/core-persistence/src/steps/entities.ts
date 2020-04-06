import Logger, { ILogger } from '@harmonyjs/logger'
import {
  SanitizedModel, Model,
  PersistenceInitializedConfig,
  IEvents, IAdapter,
} from '@harmonyjs/types-persistence'

import { sanitizeModel } from 'utils/model'
import { extractModelName } from 'utils/property/utils'


type ImportModelsArgs = { models: Record<string, Model>, logger: ILogger, strict: boolean }
export async function importModels({
  models, logger, strict,
} : ImportModelsArgs) {
  const modelNames = Object.keys(models)
  logger.info(`Initializing Persistence instance with ${modelNames.length} models`)

  return modelNames
    .map((name : string) => sanitizeModel({ model: models[name], strict, name: extractModelName(name) }))
    .map((model : SanitizedModel) => {
      logger.info(`Model '${model.name}' imported.`)
      return model
    })
}


type InitializeAdaptersArgs = {
  config: PersistenceInitializedConfig,
  adapters: { [key: string]: IAdapter },
  models: SanitizedModel[],
  events: IEvents,
  logger: ILogger,
}
export async function initializeAdapters({
  config, adapters, models, events, logger,
} : InitializeAdaptersArgs) {
  if (!config.defaultAdapter) {
    logger.warn(`No default adapter was specified. Will fallback to adapter '${
      Object.keys(adapters || { mock: null })[0] || 'mock'
    }'`)
    // eslint-disable-next-line no-param-reassign
    config.defaultAdapter = Object.keys(adapters)[0] || undefined
  }

  const { defaultAdapter } = config

  logger.info(`Adapters: [${Object.keys(adapters)}] - default: ${defaultAdapter || 'mock'}`)

  // Initialize adapters
  try {
    await Promise.all(
      Object.entries(adapters || {})
        .map(([adapterName, adapter]) => {
          const adapterLogger = Logger({ name: adapter.name, configuration: config.log })
          adapterLogger.level = logger.level

          return adapter.initialize({
            models: models.filter((m) => adapterName === (m.adapter || defaultAdapter)),
            events,
            logger: adapterLogger,
          })
        }),
    )
  } catch (err) {
    logger.error(err)
    throw new Error('An error occurred while initializing adapters')
  }
}
