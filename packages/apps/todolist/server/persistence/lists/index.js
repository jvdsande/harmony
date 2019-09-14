import schema from './schema'
import fields from './fields'

export default {
  name: 'list',
  schema,
  fields,

  elasticsearch: {
    fields: {
      name: {
        type: 'text',
        value(doc) {
          return doc.name
        },
      },
    },
  },
}
