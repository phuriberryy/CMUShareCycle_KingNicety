import path from 'path'
import url from 'url'
import dotenv from 'dotenv'
import { z } from 'zod'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env')

// Load .env file
const result = dotenv.config({ path: envPath })
if (result.error) {
  console.warn('⚠️  Warning: Could not load .env file:', result.error.message)
  console.warn('   Expected path:', envPath)
} else {
  console.log('✅ Loaded .env file from:', envPath)
  // Debug
  const maskedDbUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@')
    : undefined
  console.log('🔎 ENV check:', {
    PORT: process.env.PORT,
    CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
    CLIENT_ORIGINS: process.env.CLIENT_ORIGINS,
    JWT_SECRET: process.env.JWT_SECRET ? 'set' : 'missing',
    DATABASE_URL: maskedDbUrl || 'missing',
  })
}

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  CLIENT_ORIGIN: z.string().url(),
  CLIENT_ORIGINS: z.string().optional(), // Comma-separated list of allowed origins
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  EMAIL_HOST: z.string().min(1).optional(),
  EMAIL_PORT: z.coerce.number().default(587).optional(),
  // EMAIL_USER ไม่ต้องเป็น email format เสมอ (บาง service ใช้ username)
  EMAIL_USER: z.string().min(1).optional(),
  EMAIL_PASS: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(1).optional(),
})

const parsed = schema.parse(process.env)

// Parse allowed origins - support both single origin and comma-separated list
const allowedOrigins = parsed.CLIENT_ORIGINS
  ? parsed.CLIENT_ORIGINS.split(',').map(origin => origin.trim())
  : [parsed.CLIENT_ORIGIN]

const env = {
  port: parsed.PORT,
  clientOrigin: parsed.CLIENT_ORIGIN,
  allowedOrigins,
  databaseUrl: parsed.DATABASE_URL,
  jwtSecret: parsed.JWT_SECRET,
  // Email config - ถ้าไม่ตั้งค่า จะใช้ MOCK MODE (แค่ log ใน console)
  emailHost: parsed.EMAIL_HOST,
  emailPort: parsed.EMAIL_PORT || 587,
  emailUser: parsed.EMAIL_USER,
  emailPass: parsed.EMAIL_PASS,
  emailFrom: parsed.EMAIL_FROM || parsed.EMAIL_USER,
}

export default env
