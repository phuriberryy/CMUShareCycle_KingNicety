import { internalError, notFound } from '../../../../shared/http/apiError.js'

export function notFoundHandler(req, res, _next) {
  res.status(404).json(notFound(`Route not found: ${req.method} ${req.originalUrl}`))
}

export function errorHandler(err, req, res, _next) {
  const status = Number.isInteger(err?.status) ? err.status : 500
  const isProd = process.env.NODE_ENV === 'production'

  console.error('[API ERROR]', {
    method: req.method,
    path: req.originalUrl,
    status,
    message: err?.message,
    stack: err?.stack,
  })

  res.status(status).json(
    status >= 500
      ? internalError(isProd ? 'Internal server error' : err?.message || 'Internal server error')
      : {
          code: err?.code || 'REQUEST_ERROR',
          message: err?.message || 'Request failed',
        }
  )
}
