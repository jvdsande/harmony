import createError from 'http-errors'

type Errors =
  'BadRequest' |
'Unauthorized' |
  'PaymentRequired' |
  'Forbidden' |
  'NotFound' |
  'MethodNotAllowed' |
  'NotAcceptable' |
  'ProxyAuthenticationRequired' |
  'RequestTimeout' |
  'Conflict' |
  'Gone' |
  'LengthRequired' |
  'PreconditionFailed' |
  'PayloadTooLarge' |
  'URITooLong' |
  'UnsupportedMediaType' |
  'RangeNotSatisfiable' |
  'ExpectationFailed' |
  'ImATeapot' |
  'MisdirectedRequest' |
  'UnprocessableEntity' |
  'Locked' |
  'FailedDependency' |
  'UnorderedCollection' |
  'UpgradeRequired' |
  'PreconditionRequired' |
  'TooManyRequests' |
  'RequestHeaderFieldsTooLarge' |
  'UnavailableForLegalReasons' |
  'NotImplemented' |
  'BadGateway' |
  'InternalServerError' |
  'ServiceUnavailable' |
  'GatewayTimeout' |
  'HTTPVersionNotSupported' |
  'VariantAlsoNegotiates' |
  'InsufficientStorage' |
  'LoopDetected' |
  'BandwidthLimitExceeded' |
  'NotExtended' |
  'NetworkAuthenticationRequire'

const defaultErrors : Errors[] = [
  'BadRequest',
  'Unauthorized',
  'PaymentRequired',
  'Forbidden',
  'NotFound',
  'MethodNotAllowed',
  'NotAcceptable',
  'ProxyAuthenticationRequired',
  'RequestTimeout',
  'Conflict',
  'Gone',
  'LengthRequired',
  'PreconditionFailed',
  'PayloadTooLarge',
  'URITooLong',
  'UnsupportedMediaType',
  'RangeNotSatisfiable',
  'ExpectationFailed',
  'ImATeapot',
  'MisdirectedRequest',
  'UnprocessableEntity',
  'Locked',
  'FailedDependency',
  'UnorderedCollection',
  'UpgradeRequired',
  'PreconditionRequired',
  'TooManyRequests',
  'RequestHeaderFieldsTooLarge',
  'UnavailableForLegalReasons',
  'NotImplemented',
  'BadGateway',
  'ServiceUnavailable',
  'GatewayTimeout',
  'HTTPVersionNotSupported',
  'VariantAlsoNegotiates',
  'InsufficientStorage',
  'LoopDetected',
  'BandwidthLimitExceeded',
  'NotExtended',
  'NetworkAuthenticationRequire',
]

export type IHttpErrors = Record<Errors, ((message: string) => Error)>

const HttpErrors : IHttpErrors = {} as IHttpErrors

defaultErrors.forEach((error) => {
  HttpErrors[error] = (message) => new createError[error](message)
})

HttpErrors.InternalServerError = (message) => {
  const error = new createError.InternalServerError(message)
  error.explicitInternalServerError = true
  return error
}

export default HttpErrors
