import { validationResult } from 'express-validator'
import { query } from '../../../outbound/persistence/pool.js'
import { calculateItemCO2 } from '../../../../shared/utils/co2Calculator.js'
import { detectSpam, validateImage, checkDuplicateContent } from '../../../../shared/utils/contentModeration.js'
import { getChatServer } from '../../../../application/services/chatService.js'
import { awardPostItemPoints } from '../../../../shared/utils/pointsService.js'

// Query หลัก: LEFT JOIN เพื่อไม่ทิ้ง item ถ้า user ถูกลบ, กรอง status และวันที่
const MAX_ITEM_IMAGES = 3

function normalizeImageGalleryFromBody(body) {
  const raw = body?.imageUrls ?? body?.image_urls
  if (Array.isArray(raw)) {
    return raw
      .filter((u) => typeof u === 'string' && u.trim())
      .map((u) => u.trim())
      .slice(0, MAX_ITEM_IMAGES)
  }
  const single = body?.imageUrl ?? body?.image_url
  if (typeof single === 'string' && single.trim()) return [single.trim()]
  return []
}

function parseStoredImageUrls(row) {
  const v = row?.image_urls
  if (v == null) return []
  if (Array.isArray(v)) return v.filter((u) => typeof u === 'string' && u.trim())
  if (typeof v === 'string') {
    try {
      const parsed = JSON.parse(v)
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string' && x.trim()) : []
    } catch {
      return []
    }
  }
  return []
}

function withItemGallery(row) {
  if (!row) return row
  let urls = parseStoredImageUrls(row)
  if (urls.length === 0 && row.image_url) urls = [row.image_url]
  return {
    ...row,
    image_urls: urls,
    image_url: row.image_url || urls[0] || null,
  }
}

const ITEMS_LIST_SQL = `
  SELECT i.id, i.user_id, i.title, i.category, i.item_condition, i.looking_for, i.description,
         i.available_until, i.image_url, i.image_urls, i.pickup_location, i.status, i.listing_type,
         i.created_at, i.updated_at,
         u.name AS owner_name, u.faculty AS owner_faculty
  FROM items i
  LEFT JOIN users u ON i.user_id = u.id
  WHERE (COALESCE(i.status, 'active') IN ('active', 'in_progress'))
    AND COALESCE(i.status, '') != 'donated'
    AND (i.available_until IS NULL OR i.available_until >= CURRENT_DATE)
  ORDER BY i.created_at DESC
`

// Fallback: ถ้า DB ไม่มี column status/available_until ใช้ query นี้แล้วกรองในโค้ด
const ITEMS_LIST_FALLBACK_SQL = `
  SELECT i.*, u.name AS owner_name, u.faculty AS owner_faculty
  FROM items i
  LEFT JOIN users u ON i.user_id = u.id
  ORDER BY i.created_at DESC
`

function filterAndMapItems(rows) {
  const today = new Date().toISOString().slice(0, 10)
  return rows
    .filter((item) => {
      const status = item.status == null ? 'active' : item.status
      if (status === 'donated' || status === 'exchanged') return false
      if (status !== 'active' && status !== 'in_progress') return false
      if (item.available_until && String(item.available_until).slice(0, 10) < today) return false
      return true
    })
    .map((item) => {
      const row = withItemGallery(item)
      return {
        ...row,
        co2_footprint: calculateItemCO2(row.category, row.item_condition),
      }
    })
}

// ดึง items ทั้งหมด (public)
export const getItems = async (_req, res) => {
  const run = async (useFallback = false) => {
    const sql = useFallback ? ITEMS_LIST_FALLBACK_SQL : ITEMS_LIST_SQL
    const result = await query(sql.trim())
    return useFallback
      ? filterAndMapItems(result.rows)
      : result.rows.map((item) => {
          const row = withItemGallery(item)
          return {
            ...row,
            co2_footprint: calculateItemCO2(row.category, row.item_condition),
          }
        })
  }
  try {
    const itemsWithCO2 = await run(false)
    return res.json(Array.isArray(itemsWithCO2) ? itemsWithCO2 : [])
  } catch (err) {
    const isConnectionError = /terminated|ECONNRESET|ETIMEDOUT|Connection/.test(err?.message || '')
    if (isConnectionError) {
      try {
        const itemsWithCO2 = await run(false)
        return res.json(Array.isArray(itemsWithCO2) ? itemsWithCO2 : [])
      } catch (retryErr) {
        console.error('Get items error (after retry):', retryErr.message)
        return res.status(500).json({ message: 'Internal server error' })
      }
    }
    // ถ้า query หลัก fail (เช่น column ไม่มี) ลอง fallback
    try {
      const itemsWithCO2 = await run(true)
      return res.json(Array.isArray(itemsWithCO2) ? itemsWithCO2 : [])
    } catch (fallbackErr) {
      console.error('Get items error:', fallbackErr.message)
      return res.status(500).json({ message: 'Internal server error' })
    }
  }
}

// ดึง item โดย ID
export const getItemById = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    })
  }

  const { itemId } = req.params

  try {
    const result = await query(
      `SELECT items.*, users.name as owner_name, users.faculty as owner_faculty, users.email as owner_email
       FROM items
       JOIN users ON items.user_id = users.id
       WHERE items.id=$1`,
      [itemId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Item not found' })
    }

    const item = withItemGallery(result.rows[0])

    // คำนวณ CO₂ footprint
    item.co2_footprint = calculateItemCO2(item.category, item.item_condition)

    return res.json(item)
  } catch (err) {
    console.error('Get item by id error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// สร้าง item ใหม่
export const createItem = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { title, category, itemCondition, lookingFor, description, availableUntil, pickupLocation, listingType } =
    req.body

  try {
    // Content moderation checks
    const titleSpamCheck = detectSpam(title)
    if (titleSpamCheck.isSpam) {
      return res.status(400).json({ 
        message: 'Title contains inappropriate content',
        reason: titleSpamCheck.reason 
      })
    }

    if (description) {
      const descSpamCheck = detectSpam(description)
      if (descSpamCheck.isSpam) {
        return res.status(400).json({ 
          message: 'Description contains inappropriate content',
          reason: descSpamCheck.reason 
        })
      }
    }

    if (lookingFor) {
      const lookingForSpamCheck = detectSpam(lookingFor)
      if (lookingForSpamCheck.isSpam) {
        return res.status(400).json({ 
          message: 'Looking for contains inappropriate content',
          reason: lookingForSpamCheck.reason 
        })
      }
    }

    const gallery = normalizeImageGalleryFromBody(req.body)
    if (gallery.length === 0) {
      return res.status(400).json({ message: 'At least one product image is required' })
    }
    for (const url of gallery) {
      const imageValidation = validateImage(url)
      if (!imageValidation.isValid) {
        return res.status(400).json({
          message: 'Invalid image',
          reason: imageValidation.reason,
        })
      }
    }

    // Check for duplicate content
    const duplicateCheck = await checkDuplicateContent(query, req.user.id, title, description)
    if (duplicateCheck.isDuplicate) {
      return res.status(400).json({ 
        message: duplicateCheck.reason 
      })
    }

    // Validate expiration date - cannot be in the past
    if (availableUntil) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiryDate = new Date(availableUntil)
      expiryDate.setHours(0, 0, 0, 0)
      
      if (expiryDate < today) {
        return res.status(400).json({ 
          message: 'Expiration date cannot be in the past' 
        })
      }
    }

    // Validate listingType
    const validListingType = listingType === 'donation' ? 'donation' : 'exchange'
    
    const primaryImage = gallery[0]

    const result = await query(
      `INSERT INTO items (user_id, title, category, item_condition, looking_for, description, available_until, image_url, image_urls, pickup_location, listing_type, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,'active')
       RETURNING *`,
      [
        req.user.id,
        title,
        category,
        itemCondition,
        lookingFor || null,
        description || null,
        availableUntil || null,
        primaryImage,
        JSON.stringify(gallery),
        pickupLocation || null,
        validListingType,
      ]
    )

    const item = withItemGallery(result.rows[0])
    
    // คำนวณ CO₂ footprint
    item.co2_footprint = calculateItemCO2(item.category, item.item_condition)

    // ให้แต้มสะสมสำหรับการโพสต์รายการใหม่
    await awardPostItemPoints(req.user.id, item.id)

    // Emit socket event for real-time update
    const io = getChatServer()
    if (io) {
      io.emit('item:created')
    }

    return res.status(201).json(item)
  } catch (err) {
    console.error('Create item error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// อัปเดต item
export const updateItem = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { itemId } = req.params
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { title, category, itemCondition, lookingFor, description, availableUntil, imageUrl, pickupLocation, status, listingType } =
    req.body

  const hasImageUrlsKey = Object.prototype.hasOwnProperty.call(req.body, 'imageUrls')
    || Object.prototype.hasOwnProperty.call(req.body, 'image_urls')
  const hasImageUrlKey =
    Object.prototype.hasOwnProperty.call(req.body, 'imageUrl')
    || Object.prototype.hasOwnProperty.call(req.body, 'image_url')

  try {
    // Content moderation checks for updates
    if (title) {
      const titleSpamCheck = detectSpam(title)
      if (titleSpamCheck.isSpam) {
        return res.status(400).json({ 
          message: 'Title contains inappropriate content',
          reason: titleSpamCheck.reason 
        })
      }
    }

    if (description) {
      const descSpamCheck = detectSpam(description)
      if (descSpamCheck.isSpam) {
        return res.status(400).json({ 
          message: 'Description contains inappropriate content',
          reason: descSpamCheck.reason 
        })
      }
    }

    if (lookingFor) {
      const lookingForSpamCheck = detectSpam(lookingFor)
      if (lookingForSpamCheck.isSpam) {
        return res.status(400).json({ 
          message: 'Looking for contains inappropriate content',
          reason: lookingForSpamCheck.reason 
        })
      }
    }

    let galleryJsonParam = null
    let imageUrlParam = imageUrl

    if (hasImageUrlsKey || hasImageUrlKey) {
      const gallery = normalizeImageGalleryFromBody(req.body)
      if (gallery.length === 0) {
        return res.status(400).json({ message: 'At least one product image is required' })
      }
      for (const u of gallery) {
        const imageValidation = validateImage(u)
        if (!imageValidation.isValid) {
          return res.status(400).json({
            message: 'Invalid image',
            reason: imageValidation.reason,
          })
        }
      }
      galleryJsonParam = JSON.stringify(gallery)
      imageUrlParam = gallery[0]
    }

    // ตรวจสอบว่า item เป็นของ user นี้หรือไม่
    const itemCheck = await query('SELECT user_id FROM items WHERE id=$1', [itemId])
    if (!itemCheck.rowCount) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (itemCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only update your own items' })
    }

    // Validate expiration date - cannot be in the past
    if (availableUntil) {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const expiryDate = new Date(availableUntil)
      expiryDate.setHours(0, 0, 0, 0)
      
      if (expiryDate < today) {
        return res.status(400).json({ 
          message: 'Expiration date cannot be in the past' 
        })
      }
    }

    // Validate listingType if provided
    const validListingType = listingType === 'donation' ? 'donation' : (listingType === 'exchange' ? 'exchange' : null)
    
    const result = await query(
      `UPDATE items 
       SET title=COALESCE($1, title),
           category=COALESCE($2, category),
           item_condition=COALESCE($3, item_condition),
           looking_for=COALESCE($4, looking_for),
           description=COALESCE($5, description),
           available_until=COALESCE($6, available_until),
           image_url = CASE WHEN $12 IS NOT NULL THEN $7 ELSE COALESCE($7, image_url) END,
           image_urls = CASE WHEN $12 IS NOT NULL THEN $12::jsonb ELSE image_urls END,
           pickup_location=COALESCE($8, pickup_location),
           status=COALESCE($9, status),
           listing_type=COALESCE($10, listing_type),
           updated_at=NOW()
       WHERE id=$11
       RETURNING *`,
      [
        title,
        category,
        itemCondition,
        lookingFor,
        description,
        availableUntil,
        imageUrlParam,
        pickupLocation,
        status,
        validListingType,
        itemId,
        galleryJsonParam,
      ]
    )

    const item = withItemGallery(result.rows[0])
    
    // คำนวณ CO₂ footprint
    item.co2_footprint = calculateItemCO2(item.category, item.item_condition)

    // Emit socket event for real-time update
    const io = getChatServer()
    if (io) {
      io.emit('item:updated', { itemId: item.id })
    }

    return res.json(item)
  } catch (err) {
    console.error('Update item error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ลบ item
export const deleteItem = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { itemId } = req.params

  try {
    // ตรวจสอบว่า item เป็นของ user นี้หรือไม่
    const itemCheck = await query('SELECT user_id FROM items WHERE id=$1', [itemId])
    if (!itemCheck.rowCount) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (itemCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own items' })
    }

    // ลบ item (CASCADE จะลบ exchange_requests ที่เกี่ยวข้องด้วย)
    await query('DELETE FROM items WHERE id=$1', [itemId])

    // Emit socket event for real-time update
    const io = getChatServer()
    if (io) {
      io.emit('item:deleted', { itemId })
    }

    return res.json({ success: true, message: 'Item deleted successfully' })
  } catch (err) {
    console.error('Delete item error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ดึง exchange requests ของ item
export const getItemExchangeRequests = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { itemId } = req.params

  try {
    // ตรวจสอบว่า item เป็นของ user นี้หรือไม่
    const itemCheck = await query('SELECT user_id FROM items WHERE id=$1', [itemId])
    if (!itemCheck.rowCount) {
      return res.status(404).json({ message: 'Item not found' })
    }

    if (itemCheck.rows[0].user_id !== req.user.id) {
      return res.status(403).json({ message: 'You can only view exchange requests for your own items' })
    }

    const result = await query(
      `SELECT 
        er.*,
        u.name as requester_name,
        u.email as requester_email,
        u.faculty as requester_faculty,
        i.title as item_title
       FROM exchange_requests er
       JOIN users u ON er.requester_id = u.id
       JOIN items i ON er.item_id = i.id
       WHERE er.item_id = $1
       ORDER BY er.created_at DESC`,
      [itemId]
    )

    return res.json(result.rows)
  } catch (err) {
    console.error('Get item exchange requests error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ดึง items ของผู้ใช้
export const getUserItems = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const { userId } = req.params
  const targetUserId = userId || req.user.id

  try {
    const result = await query(
      `SELECT * FROM items 
       WHERE user_id=$1 
       ORDER BY created_at DESC`,
      [targetUserId]
    )

    // คำนวณ CO₂ footprint สำหรับแต่ละ item
    const itemsWithCO2 = result.rows.map((item) => {
      const row = withItemGallery(item)
      return {
        ...row,
        co2_footprint: calculateItemCO2(row.category, row.item_condition),
      }
    })

    return res.json(itemsWithCO2)
  } catch (err) {
    console.error('Get user items error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}
