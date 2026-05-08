import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createExchangeRequest,
  getExchangeRequest,
  acceptExchangeRequestByOwner,
  acceptExchangeRequestByRequester,
  rejectExchangeRequest,
  getMyExchangeRequests,
} from '../controllers/exchangeController.js'

const router = Router()

// ต้อง authenticated ทุก route
router.use(authenticate)

// สร้างคำขอแลกเปลี่ยน
router.post(
  '/',
  [
    body('itemId').isUUID(),
    body('message').optional().isString().trim().isLength({ max: 1000 }),
    body('requesterItemName').optional().isString().trim().isLength({ max: 120 }),
    body('requesterItemCategory').optional().isString().trim().isLength({ max: 80 }),
    body('requesterItemCondition').optional().isString().trim().isLength({ max: 40 }),
    body('requesterItemDescription').optional().isString().trim().isLength({ max: 2000 }),
    body('requesterItemImageUrl').optional().isString(),
    body('requesterPickupLocation').optional().isString().trim().isLength({ max: 200 }),
  ],
  validateRequest,
  createExchangeRequest
)

// ดึงคำขอแลกเปลี่ยนที่เกี่ยวข้องกับผู้ใช้
router.get('/my-requests', getMyExchangeRequests)

// ดึงรายละเอียดคำขอแลกเปลี่ยน
router.get(
  '/:requestId',
  [param('requestId').isUUID()],
  validateRequest,
  getExchangeRequest
)

// เจ้าของโพสต์ยอมรับคำขอแลกเปลี่ยน
router.post(
  '/:requestId/accept-owner',
  [param('requestId').isUUID()],
  validateRequest,
  acceptExchangeRequestByOwner
)

// ผู้ขอแลกยอมรับคำขอแลกเปลี่ยน
router.post(
  '/:requestId/accept-requester',
  [param('requestId').isUUID()],
  validateRequest,
  acceptExchangeRequestByRequester
)

// ปฏิเสธคำขอแลกเปลี่ยน
router.post(
  '/:requestId/reject',
  [param('requestId').isUUID()],
  validateRequest,
  rejectExchangeRequest
)

export default router
