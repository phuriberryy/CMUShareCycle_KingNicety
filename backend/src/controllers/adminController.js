import { validationResult } from 'express-validator'
import { query } from '../db/pool.js'
import { logAdminAction } from '../utils/auditLogger.js'

// ---- Dashboard -------------------------------------------------------------

export const getAdminSummary = async (_req, res) => {
  try {
    const [usersResult, itemsResult, chatsResult, reportsResult] = await Promise.all([
      query('SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS count FROM items WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS count FROM chats WHERE deleted_at IS NULL'),
      query('SELECT COUNT(*) AS count FROM reports'),
    ])

    return res.json({
      totalUsers: Number(usersResult.rows[0]?.count || 0),
      totalItems: Number(itemsResult.rows[0]?.count || 0),
      totalChats: Number(chatsResult.rows[0]?.count || 0),
      totalReports: Number(reportsResult.rows[0]?.count || 0),
    })
  } catch (err) {
    console.error('Admin summary error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ---- User Management -------------------------------------------------------

export const listUsers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
  const search = (req.query.search || '').trim()

  const offset = (page - 1) * pageSize

  try {
    const params = []
    let where = 'WHERE u.deleted_at IS NULL'
    if (search) {
      params.push(`%${search.toLowerCase()}%`)
      where += ` AND (LOWER(u.name) LIKE $${params.length} OR LOWER(u.email) LIKE $${params.length})`
    }

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM users u ${where}`,
      params
    )

    params.push(pageSize, offset)
    const usersResult = await query(
      `
      SELECT 
        u.id, u.name, u.email, u.faculty, u.role, u.is_suspended, u.created_at,
        u.total_points, u.total_exchanges, u.total_donations
      FROM users u
      ${where}
      ORDER BY u.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    )

    return res.json({
      data: usersResult.rows,
      pagination: {
        page,
        pageSize,
        total: Number(countResult.rows[0]?.count || 0),
      },
    })
  } catch (err) {
    console.error('Admin list users error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateUserRole = async (req, res) => {
  const { id } = req.params
  const { role } = req.body || {}

  if (!['user', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' })
  }

  try {
    const result = await query(
      `UPDATE users 
       SET role = $1 
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, name, email, faculty, role, is_suspended, created_at`,
      [role, id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'UPDATE_USER_ROLE',
      entityType: 'user',
      entityId: id,
      metadata: { role },
    })

    return res.json(result.rows[0])
  } catch (err) {
    console.error('Admin update user role error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateUserSuspension = async (req, res) => {
  const { id } = req.params
  const { suspended } = req.body || {}

  if (typeof suspended !== 'boolean') {
    return res.status(400).json({ message: 'suspended must be boolean' })
  }

  try {
    const result = await query(
      `UPDATE users 
       SET is_suspended = $1 
       WHERE id = $2 AND deleted_at IS NULL
       RETURNING id, name, email, faculty, role, is_suspended, created_at`,
      [suspended, id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: suspended ? 'SUSPEND_USER' : 'UNSUSPEND_USER',
      entityType: 'user',
      entityId: id,
    })

    return res.json(result.rows[0])
  } catch (err) {
    console.error('Admin update user suspension error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const softDeleteUser = async (req, res) => {
  const { id } = req.params
  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own admin account' })
  }

  try {
    const result = await query(
      `UPDATE users 
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, name, email`,
      [id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found or already deleted' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'SOFT_DELETE_USER',
      entityType: 'user',
      entityId: id,
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('Admin soft delete user error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ---- Item Management -------------------------------------------------------

export const listItems = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
  const status = (req.query.status || '').trim()

  const offset = (page - 1) * pageSize

  try {
    const params = []
    let where = 'WHERE i.deleted_at IS NULL'

    if (status) {
      params.push(status)
      where += ` AND i.status = $${params.length}`
    }

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM items i ${where}`,
      params
    )

    params.push(pageSize, offset)
    const itemsResult = await query(
      `
      SELECT 
        i.id, i.title, i.category, i.item_condition, i.status, i.listing_type,
        i.created_at, i.updated_at,
        u.id AS owner_id, u.name AS owner_name, u.email AS owner_email
      FROM items i
      JOIN users u ON i.user_id = u.id
      ${where}
      ORDER BY i.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    )

    return res.json({
      data: itemsResult.rows,
      pagination: {
        page,
        pageSize,
        total: Number(countResult.rows[0]?.count || 0),
      },
    })
  } catch (err) {
    console.error('Admin list items error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const softDeleteItem = async (req, res) => {
  const { id } = req.params

  try {
    const result = await query(
      `UPDATE items 
       SET deleted_at = NOW(), status = 'removed_by_admin'
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING id, title`,
      [id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Item not found or already deleted' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'SOFT_DELETE_ITEM',
      entityType: 'item',
      entityId: id,
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('Admin soft delete item error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ---- Reports ---------------------------------------------------------------

export const listReports = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
  const status = (req.query.status || '').trim()

  const offset = (page - 1) * pageSize

  try {
    const params = []
    let where = 'WHERE 1=1'
    if (status) {
      params.push(status)
      where += ` AND r.status = $${params.length}`
    }

    const countResult = await query(
      `SELECT COUNT(*) AS count FROM reports r ${where}`,
      params
    )

    params.push(pageSize, offset)
    const reportsResult = await query(
      `
      SELECT 
        r.*,
        u.name AS reporter_name,
        u.email AS reporter_email
      FROM reports r
      LEFT JOIN users u ON r.reporter_id = u.id
      ${where}
      ORDER BY r.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    )

    return res.json({
      data: reportsResult.rows,
      pagination: {
        page,
        pageSize,
        total: Number(countResult.rows[0]?.count || 0),
      },
    })
  } catch (err) {
    console.error('Admin list reports error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const updateReportStatus = async (req, res) => {
  const { id } = req.params
  const { status } = req.body || {}

  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  try {
    const result = await query(
      `UPDATE reports 
       SET status = $1,
           resolved_at = CASE WHEN $1 IN ('approved','rejected') THEN NOW() ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [status, id]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Report not found' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'UPDATE_REPORT_STATUS',
      entityType: 'report',
      entityId: id,
      metadata: { status },
    })

    return res.json(result.rows[0])
  } catch (err) {
    console.error('Admin update report status error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

// ---- Chats & Messages ------------------------------------------------------

export const listChats = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize, 10) || 20, 1), 100)
  const offset = (page - 1) * pageSize

  try {
    const countResult = await query(
      'SELECT COUNT(*) AS count FROM chats WHERE deleted_at IS NULL'
    )

    const chatsResult = await query(
      `
      SELECT 
        c.*,
        creator.name AS creator_name,
        creator.email AS creator_email,
        participant.name AS participant_name,
        participant.email AS participant_email
      FROM chats c
      JOIN users creator ON c.creator_id = creator.id
      JOIN users participant ON c.participant_id = participant.id
      WHERE c.deleted_at IS NULL
      ORDER BY c.created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [pageSize, offset]
    )

    return res.json({
      data: chatsResult.rows,
      pagination: {
        page,
        pageSize,
        total: Number(countResult.rows[0]?.count || 0),
      },
    })
  } catch (err) {
    console.error('Admin list chats error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const getChatMessages = async (req, res) => {
  const { chatId } = req.params

  try {
    const messagesResult = await query(
      `
      SELECT 
        m.id, m.body, m.sender_id, m.created_at,
        u.name AS sender_name, u.email AS sender_email
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.chat_id = $1
      ORDER BY m.created_at ASC
      `,
      [chatId]
    )

    return res.json(messagesResult.rows)
  } catch (err) {
    console.error('Admin get chat messages error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

export const softDeleteMessage = async (req, res) => {
  const { chatId, messageId } = req.params

  try {
    const result = await query(
      `
      UPDATE messages
      SET deleted_at = NOW()
      WHERE id = $1 AND chat_id = $2 AND deleted_at IS NULL
      RETURNING id, chat_id
      `,
      [messageId, chatId]
    )

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Message not found or already deleted' })
    }

    await logAdminAction({
      adminId: req.user.id,
      action: 'SOFT_DELETE_MESSAGE',
      entityType: 'message',
      entityId: messageId,
      metadata: { chatId },
    })

    return res.json({ success: true })
  } catch (err) {
    console.error('Admin soft delete message error:', err)
    return res.status(500).json({ message: 'Internal server error' })
  }
}

