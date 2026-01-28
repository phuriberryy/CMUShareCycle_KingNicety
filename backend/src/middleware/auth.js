import { verifyToken } from '../utils/token.js'

export const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    console.log('❌ Missing or invalid Authorization header:', authHeader ? 'Present but wrong format' : 'Missing')
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const token = authHeader.split(' ')[1]
    if (!token) {
      console.log('❌ Token is empty after Bearer prefix')
      return res.status(401).json({ message: 'Invalid token' })
    }
    const user = verifyToken(token)
    req.user = user
    return next()
  } catch (err) {
    console.error('❌ Token verification failed:', err.message)
    return res.status(401).json({ message: 'Invalid token' })
  }
}











