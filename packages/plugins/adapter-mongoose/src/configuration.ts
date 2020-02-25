import { ConnectionOptions } from 'mongoose'

export type AdapterMongooseConfiguration = {
  host: string,
  credentials?: {
    login: string,
    password: string,
  },
  database: string,
  connectionRetryTimeout?: number,

  // Mongoose configuration to be merged
  mongooseConfig?: Omit<ConnectionOptions, 'user'|'pass'|'dbName'|'useNewUrlParser'>
}
