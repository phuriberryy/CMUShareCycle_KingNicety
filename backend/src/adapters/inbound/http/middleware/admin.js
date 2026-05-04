import { authenticate } from './auth.js'

// Alias to match requirement wording
export const requireAuth = authenticate

export const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  // Default to "user" if role is missing to avoid accidentally granting access
  const role = req.user.role || 'user'
  if (role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin access required' })
  }

  return next()
}

