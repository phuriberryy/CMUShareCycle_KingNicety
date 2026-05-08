import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  createDonationRequest,
  getDonationRequest,
  acceptDonationRequestByOwner,
  acceptDonationRequestByRequester,
  rejectDonationRequest,
  getMyDonationRequests,
} from '../controllers/donationRequestController.js'

const router = Router()

router.use(authenticate)

// สร้างคำขอรับบริจาค
router.post(
  '/',
  [
    body('itemId').isUUID().withMessage('Item ID is required'),
    body('recipientName')
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage('Recipient name is required'),
    body('recipientContact')
      .trim()
      .notEmpty()
      .isLength({ max: 120 })
      .withMessage('Recipient contact is required'),
    body('message').optional().isString().trim().isLength({ max: 1000 }),
  ],
  validateRequest,
  createDonationRequest
)

// ดึงคำขอรับบริจาคที่เกี่ยวข้องกับผู้ใช้
router.get('/my-requests', getMyDonationRequests)

// ดึงรายละเอียดคำขอรับบริจาค
router.get('/:requestId', [param('requestId').isUUID()], validateRequest, getDonationRequest)

// เจ้าของโพสต์ยอมรับคำขอรับบริจาค
router.post('/:requestId/accept-owner', [param('requestId').isUUID()], validateRequest, acceptDonationRequestByOwner)

// ผู้ขอรับบริจาคยอมรับคำขอ
router.post('/:requestId/accept-requester', [param('requestId').isUUID()], validateRequest, acceptDonationRequestByRequester)

// ปฏิเสธคำขอรับบริจาค
router.post('/:requestId/reject', [param('requestId').isUUID()], validateRequest, rejectDonationRequest)

export default router

