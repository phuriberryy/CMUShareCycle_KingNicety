export function errorPayload(code, message, extra = {}) {
  return { code, message, ...extra }
}

export function badRequest(message = 'Bad request', extra = {}) {
  return errorPayload('BAD_REQUEST', message, extra)
}

export function unauthorized(message = 'Unauthorized', extra = {}) {
  return errorPayload('UNAUTHORIZED', message, extra)
}

export function forbidden(message = 'Forbidden', extra = {}) {
  return errorPayload('FORBIDDEN', message, extra)
}

export function notFound(message = 'Not found', extra = {}) {
  return errorPayload('NOT_FOUND', message, extra)
}

export function conflict(message = 'Conflict', extra = {}) {
  return errorPayload('CONFLICT', message, extra)
}

export function internalError(message = 'Internal server error', extra = {}) {
  return errorPayload('INTERNAL_ERROR', message, extra)
}

export function serviceUnavailable(message = 'Service unavailable', extra = {}) {
  return errorPayload('SERVICE_UNAVAILABLE', message, extra)
}
