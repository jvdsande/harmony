import Mexp from 'mongoose-elasticsearch-xp'

// Import elasticsearch so that Mixt knows to bundle it
import 'elasticsearch'

function makeEsExtend(fields) {
  const esFields = {}

  Object.keys(fields).forEach((f) => {
    const field = fields[f]

    esFields[f] = {
      es_value: field.value || field.es_value,
      es_type: field.type || field.es_type,
    }
  })

  return esFields
}

export default class AccessorMongoosePluginElascicSearch {
  params: any = {}

  constructor({
    host, auth, port, protocol, prefix,
  }) {
    this.params.host = host
    this.params.auth = auth
    this.params.port = port
    this.params.protocol = protocol
    this.params.prefix = prefix
  }

  initialize({ models, schemas, logger }) {
    logger.info('Registering Mongoose-Elasticsearch plugin')

    models.forEach((model) => {
      if (!model.elasticsearch || !model.elasticsearch.fields) {
        return
      }

      logger.info(`Found Elasticsearch definitions for model ${model.name}, configuring Elasticsearch support`)

      const schema = schemas[model.name]

      schema.options.es_extends = makeEsExtend(model.elasticsearch.fields)

      async function updateHook(doc, next) {
        if (model.elasticsearch.populate) {
          let exec = doc

          Object.keys(model.elasticsearch.populate)
            .forEach((p) => {
              if (model.elasticsearch.populate[p] === true) {
                exec = exec.populate(p)
              } else {
                exec = exec.populate({
                  path: p,
                  populate: model.elasticsearch.populate[p],
                })
              }
            })

          await exec.execPopulate()
        }
        next()
      }

      // Create
      schema.post('save', updateHook)
      // CreateMany
      schema.post('insertMany', updateHook)
      // Update, UpdateMany
      schema.post('findOneAndUpdate', updateHook)
      // Delete, DeleteMany

      // Other update middleware
      schema.post('update', updateHook)
      schema.post('updateOne', updateHook)
      schema.post('updateMany', updateHook)

      const mexpParams: any = { ...this.params, hydrate: true }

      if (this.params.prefix) {
        mexpParams.index = `${this.params.prefix}_${model.name}`.toLowerCase()
        mexpParams.type = `${this.params.prefix}_${model.name}`.toLowerCase()
      } else {
        mexpParams.index = `${model.name}`.toLowerCase()
        mexpParams.type = `${model.name}`.toLowerCase()
      }

      logger.info(`Elasticsearch support added for model ${model.name}, index ${mexpParams.index}`)

      schema.plugin(Mexp, mexpParams)
    })
  }
}
