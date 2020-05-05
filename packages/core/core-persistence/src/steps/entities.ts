import Logger, { ILogger } from '@harmonyjs/logger'
import {
  SanitizedModel, Model,
  PersistenceConfig,
  IEvents, IAdapter,
} from '@harmonyjs/types-persistence'
import { GraphQLID, GraphQLScalarType } from 'graphql'

import { sanitizeModel } from 'utils/model'
import { extractModelName } from 'utils/property/utils'


type ImportModelsArgs = { models: Record<string, Model>, logger: ILogger, defaultAdapter: string, strict: boolean }
export async function importModels({
  models, logger, defaultAdapter, strict,
} : ImportModelsArgs) {
  const modelNames = Object.keys(models)
  logger.info(`Initializing Persistence instance with ${modelNames.length} models`)

  return modelNames
    .map((name : string) => sanitizeModel({
      model: models[name], strict, name: extractModelName(name), defaultAdapter,
    }))
    .map((model : SanitizedModel) => {
      logger.info(`Model '${model.name}' imported.`)
      return model
    })
}


type InitializeAdaptersArgs = {
  config: PersistenceConfig
  adapters: { [key: string]: IAdapter }
  models: SanitizedModel[]
  events: IEvents
  scalars: { [key: string]: GraphQLScalarType }
  logger: ILogger
}
export async function initializeAdapters({
  config, adapters, models, events, scalars, logger,
} : InitializeAdaptersArgs) {
  const { defaultAdapter } = config

  logger.info(`Adapters: [${Object.keys(adapters)}] - default: ${defaultAdapter || 'mock'}`)

  // Create the scalar type for defaultAdapter -- useful especially for 'mock'
  if (!scalars[`${extractModelName(defaultAdapter)}ID`]) {
    // eslint-disable-next-line no-param-reassign
    scalars[`${extractModelName(defaultAdapter)}ID`] = GraphQLID
  }

  // Initialize adapters
  try {
    await Promise.all(
      Object.entries(adapters || {})
        .map(([adapterName, adapter]) => {
          const adapterLogger = Logger({ name: adapter.name, configuration: config.log })
          adapterLogger.level = logger.level

          if (!scalars[`${extractModelName(adapterName)}ID`]) {
            // eslint-disable-next-line no-param-reassign
            scalars[`${extractModelName(adapterName)}ID`] = GraphQLID
          }

          if (adapter.scalar) {
            // eslint-disable-next-line no-param-reassign
            scalars[`${extractModelName(adapterName)}ID`] = adapter.scalar
          }

          return adapter.initialize({
            models: models
              .filter((m) => adapterName === (m.adapter || defaultAdapter))
              .filter((m) => !m.external),
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
