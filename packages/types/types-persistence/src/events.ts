import { SanitizedModel } from 'model'

export interface IEvents {
  subscriptions : {
    updated: ((args: { document: any, model: SanitizedModel }) => void)[]
    removed: ((args: { document: any, model: SanitizedModel }) => void)[]
  }

  on(event : 'updated'|'removed', callback : (args: { document: any, model: SanitizedModel }) => void): void

  updated({ document, model } : { document: any, model: SanitizedModel }): void

  removed({ document, model } : { document: any, model: SanitizedModel }): void
}
