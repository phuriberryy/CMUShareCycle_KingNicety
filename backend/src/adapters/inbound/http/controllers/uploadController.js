import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import { badRequest, unauthorized } from '../../../../shared/http/apiError.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/chat')
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true })
  }
}

export const uploadChatImage = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }
  const { image: dataUrl } = req.body
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json(badRequest('Invalid image data'))
  }
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) {
    return res.status(400).json(badRequest('Invalid base64 image'))
  }
  const mime = match[1]
  const ext = mime.replace('image/', '') === 'jpeg' ? 'jpg' : mime.replace('image/', '')
  if (!ALLOWED_TYPES.includes(mime)) {
    return res.status(400).json(badRequest('Allowed types: JPEG, PNG, GIF, WebP'))
  }
  const base64 = match[2]
  const buffer = Buffer.from(base64, 'base64')
  if (buffer.length > MAX_SIZE_BYTES) {
    return res.status(400).json(badRequest('Image must be under 5MB'))
  }
  ensureUploadDir()
  const filename = `${randomBytes(12).toString('hex')}.${ext}`
  const filepath = path.join(UPLOAD_DIR, filename)
  fs.writeFileSync(filepath, buffer)
  const protocol = req.get('x-forwarded-proto') || req.protocol || 'http'
  const host = req.get('host') || 'localhost:4000'
  const imageUrl = `${protocol}://${host}/uploads/chat/${filename}`
  return res.json({ url: imageUrl })
}
