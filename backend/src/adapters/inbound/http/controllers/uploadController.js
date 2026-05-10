import fs from 'fs'
import path from 'path'
import { randomBytes } from 'crypto'
import multer from 'multer'
import { badRequest, unauthorized } from '../../../../shared/http/apiError.js'

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads/chat')
const MAX_SIZE_BYTES = 15 * 1024 * 1024 // 15 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const raw = path.extname(file.originalname).toLowerCase()
    const ext = /^\.[a-z0-9]+$/.test(raw) ? raw.slice(1) : 'jpg'
    cb(null, `${randomBytes(12).toString('hex')}.${ext}`)
  },
})

// Exported so chat.routes.js can apply it as route middleware
export const uploadMulter = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) cb(null, true)
    else cb(Object.assign(new Error('Allowed types: JPEG, PNG, GIF, WebP'), { status: 400 }))
  },
})

const buildImageUrl = (req, filename) => {
  // Use /api/uploads path so it routes through Nginx's existing /api/ proxy.
  // This avoids needing a separate Nginx /uploads/ location block.
  if (process.env.PUBLIC_URL) {
    return `${process.env.PUBLIC_URL.replace(/\/$/, '')}/api/uploads/chat/${filename}`
  }
  const proto = req.get('x-forwarded-proto') || req.protocol || 'http'
  const host = req.get('host') || 'localhost:4000'
  return `${proto}://${host}/api/uploads/chat/${filename}`
}

export const uploadChatImage = async (req, res) => {
  if (!req.user) return res.status(401).json(unauthorized())

  // ── Path A: multipart/form-data (field name: "file") ────────────────────
  // multer middleware already wrote the file to disk and populated req.file
  if (req.file) {
    console.log('[UPLOAD] multipart | file:', req.file.originalname, '|', req.file.size, 'bytes')
    return res.json({ url: buildImageUrl(req, req.file.filename) })
  }

  // ── Path B: legacy base64 JSON body (field name: "image") ───────────────
  const { image: dataUrl } = req.body || {}
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image/')) {
    return res.status(400).json(badRequest('Send file via FormData (field: "file") or base64 via JSON (field: "image")'))
  }
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/)
  if (!match) return res.status(400).json(badRequest('Invalid base64 image'))
  const [, mime, b64] = match
  if (!ALLOWED_TYPES.includes(mime)) return res.status(400).json(badRequest('Allowed types: JPEG, PNG, GIF, WebP'))
  const buffer = Buffer.from(b64, 'base64')
  if (buffer.length > MAX_SIZE_BYTES) return res.status(400).json(badRequest('Image must be under 15 MB'))
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.replace('image/', '')
  const filename = `${randomBytes(12).toString('hex')}.${ext}`
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), buffer)
  console.log('[UPLOAD] base64 | size:', buffer.length, 'bytes')
  return res.json({ url: buildImageUrl(req, filename) })
}
