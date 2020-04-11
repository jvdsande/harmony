export default interface AdapterCouchbaseConfiguration {
  host: string,
  credentials?: {
    login: string,
    password: string,
  },
  bucket: string,
  identifiers: {
    channels: boolean,
    field?: string,
  } | {
    channels?: boolean,
    field: string,
  }
}
