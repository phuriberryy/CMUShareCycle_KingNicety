function sanitizeString(value) {
  if (typeof value !== 'string') return value
  // Remove null bytes / control chars and strip basic HTML tags
  // to reduce stored XSS vectors in user-generated text fields.
  return value
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .trim()
}

function sanitizeDeep(input) {
  if (Array.isArray(input)) {
    return input.map((v) => sanitizeDeep(v))
  }
  if (input && typeof input === 'object') {
    const out = {}
    for (const [key, value] of Object.entries(input)) {
      out[key] = sanitizeDeep(value)
    }
    return out
  }
  return sanitizeString(input)
}

export function sanitizeInput(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeDeep(req.body)
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeDeep(req.query)
  }
  next()
}
