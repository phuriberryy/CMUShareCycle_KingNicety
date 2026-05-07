import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createChat,
  startChatByEmail,
  getChatMessages,
  getChats,
  acceptChat,
  declineChat,
  confirmChatQr,
} from '../controllers/chatController.js'
import { uploadChatImage } from '../controllers/uploadController.js'

const router = Router()

router.use((req, _res, next) => {
  console.log('[chat:request]', req.method, req.originalUrl)
  next()
})

router.use(authenticate)

router.get('/', getChats)
router.post('/upload-image', uploadChatImage)
router.post('/start', [body('email').isEmail()], validateRequest, startChatByEmail)
router.get('/:chatId/messages', [param('chatId').isUUID()], validateRequest, getChatMessages)
router.post(
  '/',
  [
    body('participantId')
      .optional()
      .isUUID()
      .custom((value, { req }) => {
        if (!value && !req.body.participantEmail) {
          throw new Error('participantId or participantEmail is required')
        }
        return true
      }),
    body('participantEmail').optional().isEmail(),
    body('itemId').optional().isUUID(),
    body('exchangeRequestId').optional().isUUID(),
    body('initialMessage').optional().isString().isLength({ max: 1000 }),
  ],
  validateRequest,
  createChat
)

router.patch('/:chatId/accept', [param('chatId').isUUID()], validateRequest, acceptChat)
router.patch('/:chatId/decline', [param('chatId').isUUID()], validateRequest, declineChat)
router.post(
  '/:chatId/confirm',
  [param('chatId').isUUID(), body('code').isString().trim().isLength({ min: 1, max: 128 })],
  validateRequest,
  confirmChatQr
)

export default router





