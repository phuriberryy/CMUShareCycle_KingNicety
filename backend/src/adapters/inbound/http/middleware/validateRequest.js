import { validationResult } from 'express-validator'
import { badRequest } from '../../../../shared/http/apiError.js'

export function validateRequest(req, res, next) {
  const errors = validationResult(req)
  if (errors.isEmpty()) return next()

  return res.status(400).json({
    ...badRequest('Validation failed'),
    errors: errors.array().map((e) => ({
      field: e.path,
      message: e.msg,
      value: e.value,
    })),
  })
}
