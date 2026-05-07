import express from 'express'
import path from 'path'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import env from '../infrastructure/config/env.js'
import authRoutes from '../adapters/inbound/http/routes/auth.routes.js'
import itemRoutes from '../adapters/inbound/http/routes/item.routes.js'
import exchangeRoutes from '../adapters/inbound/http/routes/exchange.routes.js'
import notificationRoutes from '../adapters/inbound/http/routes/notification.routes.js'
import chatRoutes from '../adapters/inbound/http/routes/chat.routes.js'
import profileRoutes from '../adapters/inbound/http/routes/profile.routes.js'
import emailRoutes from '../adapters/inbound/http/routes/email.routes.js'
import statisticsRoutes from '../adapters/inbound/http/routes/statistics.routes.js'
import donationRoutes from '../adapters/inbound/http/routes/donation.routes.js'
import donationRequestRoutes from '../adapters/inbound/http/routes/donationRequest.routes.js'
import leaderboardRoutes from '../adapters/inbound/http/routes/leaderboard.routes.js'
import adminRoutes from '../adapters/inbound/http/routes/admin.routes.js'
import { securityHeaders } from '../adapters/inbound/http/middleware/securityHeaders.js'
import { sanitizeInput } from '../adapters/inbound/http/middleware/sanitizeInput.js'
import { errorHandler, notFoundHandler } from '../adapters/inbound/http/middleware/errorHandler.js'

const app = express()
const corsOptions = {
  origin: env.allowedOrigins,
  credentials: true,
}

app.use(cors(corsOptions))
app.use(securityHeaders)
app.use(express.json({ limit: '10mb', strict: true }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())
app.use(sanitizeInput)

app.get('/health', (_req, res) => res.json({ ok: true }))

app.options('*', cors(corsOptions))

// Serve uploaded chat images (no auth - URLs are unguessable)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/items', itemRoutes)
app.use('/api/exchange', exchangeRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/chats', chatRoutes)
app.use('/api/profile', profileRoutes)
app.use('/api/email', emailRoutes)
app.use('/api/statistics', statisticsRoutes)
app.use('/api/donations', donationRoutes)
app.use('/api/donation-requests', donationRequestRoutes)
app.use('/api/leaderboard', leaderboardRoutes)
app.use('/api/admin', adminRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

export default app
