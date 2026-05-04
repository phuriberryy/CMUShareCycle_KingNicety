import express from 'express'
import { requireAuth, requireAdmin } from '../middleware/admin.js'
import {
  getAdminSummary,
  listUsers,
  updateUserRole,
  updateUserSuspension,
  softDeleteUser,
  listItems,
  softDeleteItem,
  listReports,
  updateReportStatus,
  listChats,
  getChatMessages,
  softDeleteMessage,
} from '../controllers/adminController.js'

const router = express.Router()

// All admin routes require authenticated admin
router.use(requireAuth, requireAdmin)

// Dashboard
router.get('/summary', getAdminSummary)

// Users
router.get('/users', listUsers)
router.patch('/users/:id/role', updateUserRole)
router.patch('/users/:id/suspension', updateUserSuspension)
router.delete('/users/:id', softDeleteUser)

// Items
router.get('/items', listItems)
router.delete('/items/:id', softDeleteItem)

// Reports
router.get('/reports', listReports)
router.patch('/reports/:id/status', updateReportStatus)

// Chats & messages
router.get('/chats', listChats)
router.get('/chats/:chatId/messages', getChatMessages)
router.delete('/chats/:chatId/messages/:messageId', softDeleteMessage)

export default router

