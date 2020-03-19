export type QuerySelect = {
  [key: string]: boolean | QuerySelect
}

export type QueryArgs = {
  [key: string]: any
}

export type QueryField = {
  alias?: string,
  args?: QueryArgs,
  select?: QuerySelect,
}

export type QueryDefinition = {
  [key: string]: QueryField | boolean
}
