import { SanitizedModel } from 'model'

export interface IEvents {
  on(event : string, callback : (args: { document: any, model: SanitizedModel }) => void): void

  off(event : string, callback : (args: { document: any, model: SanitizedModel }) => void): void

  emit({ event, payload } : { event: string, payload: any }): void

  updated({ document, model } : { document: any, model: SanitizedModel }): void

  removed({ document, model } : { document: any, model: SanitizedModel }): void
}
