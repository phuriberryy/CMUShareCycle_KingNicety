import { Router } from 'express'
import { body, param } from 'express-validator'
import { authenticate } from '../middleware/auth.js'
import { createRateLimiter } from '../middleware/rateLimiter.js'
import { validateRequest } from '../middleware/validateRequest.js'
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
  getUserItems,
  getItemExchangeRequests,
} from '../controllers/itemController.js'
import { OTHER_SUBTYPE_MAX_LENGTH } from '../../../../shared/utils/co2Calculator.js'

// ตรวจ otherSubtype (free-text):
//   - บังคับเมื่อ category === 'Others' (ต้องไม่ว่าง, ยาว 2-OTHER_SUBTYPE_MAX_LENGTH)
//   - หมวดอื่น: อนุญาตว่าง/ไม่ส่ง; ถ้าส่งมาก็ต้องเป็น string สั้น ๆ
const validateOtherSubtype = (value, { req }) => {
  const cat = req.body.category
  if (cat === 'Others') {
    if (typeof value !== 'string') {
      throw new Error('Other subtype is required when category is Others')
    }
    const trimmed = value.trim()
    if (trimmed.length < 2) {
      throw new Error('กรุณาระบุประเภทย่อยของสินค้า (อย่างน้อย 2 ตัวอักษร)')
    }
    if (trimmed.length > OTHER_SUBTYPE_MAX_LENGTH) {
      throw new Error(`Other subtype must not exceed ${OTHER_SUBTYPE_MAX_LENGTH} characters`)
    }
    return true
  }
  if (value !== undefined && value !== null && value !== '') {
    if (typeof value !== 'string' || value.length > OTHER_SUBTYPE_MAX_LENGTH) {
      throw new Error(`Other subtype must not exceed ${OTHER_SUBTYPE_MAX_LENGTH} characters`)
    }
  }
  return true
}

const router = Router()

// รายการ items – จับ GET ที่ path ว่างหรือ '/' ก่อน (ต้อง await เพื่อไม่ให้ไปโดน /:itemId แล้วได้ 400)
router.use(async (req, res, next) => {
  if (req.method !== 'GET' || (req.path !== '' && req.path !== '/')) {
    return next()
  }
  try {
    await getItems(req, res)
  } catch (err) {
    next(err)
  }
})

// Specific routes must come before parameterized routes
router.get(
  '/user/:userId',
  authenticate,
  [param('userId').isUUID()],
  validateRequest,
  getUserItems
)

router.get(
  '/:itemId/exchange-requests',
  authenticate,
  [param('itemId').isUUID()],
  validateRequest,
  getItemExchangeRequests
)

// Parameterized routes (must be last)
router.get('/:itemId', [param('itemId').isUUID()], validateRequest, getItemById)

// Protected routes
// Rate limit: 5 posts per hour per user
const postItemRateLimit = createRateLimiter(5, 60 * 60 * 1000) // 5 requests per hour

router.post(
  '/',
  authenticate,
  postItemRateLimit,
  [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('category')
      .notEmpty()
      .withMessage('Category is required')
      .isIn(['Clothes & Fashion', 'Dorm Essentials', 'Books & Study', 'Kitchen & Appliances', 'Cleaning & Laundry', 'Hobbies & Entertainment', 'Sports Gear', 'Others'])
      .withMessage('Invalid category'),
    body('itemCondition')
      .notEmpty()
      .withMessage('Item condition is required')
      .isIn(['Like New', 'Good', 'Fair'])
      .withMessage('Invalid item condition'),
    // หมายเหตุ: validator ต้องรันทุกครั้ง (ไม่ใช้ .optional()) เพราะต้องบังคับเมื่อ category === 'Others'
    body('otherSubtype').custom(validateOtherSubtype),
    body('lookingFor')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Looking for must not exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('availableUntil')
      .optional()
      .isISO8601()
      .withMessage('Invalid date format'),
    body('imageUrl')
      .optional()
      .isString()
      .withMessage('Invalid image URL'),
    body('image_url').optional().isString(),
    body('imageUrls')
      .optional()
      .isArray({ max: 3 })
      .withMessage('At most 3 images'),
    body('imageUrls.*').optional().isString(),
    body('image_urls')
      .optional()
      .isArray({ max: 3 }),
    body('image_urls.*').optional().isString(),
    body('pickupLocation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Pickup location must not exceed 100 characters'),
  ],
  validateRequest,
  createItem
)

// Rate limit: 10 updates per hour per user
const updateItemRateLimit = createRateLimiter(10, 60 * 60 * 1000)

router.put(
  '/:itemId',
  authenticate,
  updateItemRateLimit,
  [
    param('itemId').isUUID(),
    body('title')
      .optional()
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('category')
      .optional()
      .notEmpty()
      .withMessage('Category cannot be empty')
      .isIn(['Clothes & Fashion', 'Dorm Essentials', 'Books & Study', 'Kitchen & Appliances', 'Cleaning & Laundry', 'Hobbies & Entertainment', 'Sports Gear', 'Others']),
    body('itemCondition')
      .optional()
      .notEmpty()
      .withMessage('Item condition cannot be empty')
      .isIn(['Like New', 'Good', 'Fair']),
    body('otherSubtype')
      .optional({ nullable: true, checkFalsy: true })
      .isString()
      .trim()
      .isLength({ min: 2, max: OTHER_SUBTYPE_MAX_LENGTH })
      .withMessage(`Other subtype must be 2-${OTHER_SUBTYPE_MAX_LENGTH} characters`),
    body('lookingFor')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Looking for must not exceed 200 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Description must not exceed 1000 characters'),
    body('availableUntil')
      .optional()
      .isISO8601(),
    body('imageUrl')
      .optional()
      .isString(),
    body('image_url').optional().isString(),
    body('imageUrls').optional().isArray({ max: 3 }),
    body('imageUrls.*').optional().isString(),
    body('image_urls').optional().isArray({ max: 3 }),
    body('image_urls.*').optional().isString(),
    body('pickupLocation')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Pickup location must not exceed 100 characters'),
    body('status')
      .optional()
      .isIn(['active', 'inactive', 'exchanged', 'deleted']),
  ],
  validateRequest,
  updateItem
)

router.delete(
  '/:itemId',
  authenticate,
  [param('itemId').isUUID()],
  validateRequest,
  deleteItem
)

export default router
