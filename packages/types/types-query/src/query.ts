export type QuerySelect = {
  [key: string]: boolean | QuerySelect
}

export type QueryArgs = {
  [key: string]: any
}

export type QueryField = {
  args?: QueryArgs,
  select?: QuerySelect,
}

export type QueryDefinition = {
  [key: string]: QueryField | boolean
}
