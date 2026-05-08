import { randomBytes } from 'crypto'
import { validationResult } from 'express-validator'
import { query } from '../../../outbound/persistence/pool.js'
import { getChatServer } from '../../../../application/services/chatService.js'
import { calculateItemCO2, calculateExchangeCO2Reduction } from '../../../../shared/utils/co2Calculator.js'
import { awardExchangePoints, awardDonationPoints } from '../../../../shared/utils/pointsService.js'
import { sendEmail } from '../../../../shared/utils/email.js'
import { exchangeCompletedEmail, donationCompletedEmail } from '../../../../shared/utils/emailTemplates.js'
import {
  badRequest,
  forbidden,
  internalError,
  notFound,
  serviceUnavailable,
  unauthorized,
} from '../../../../shared/http/apiError.js'

export const getChats = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  try {
    const rows = await fetchChatsForUser(req.user.id)
    console.log('[chat:getChats] rows.length =', rows.length)
    console.log('[chat:getChats] raw rows sample =', rows[0])
    const allChats = rows.map((row) => mapChatRow(row, req.user.id))
    console.log('[chat:getChats] mapped sample =', allChats[0])

  // กรองแชทที่มีอีเมลเดียวกันออก เหลือแค่แชทเดียว (ล่าสุด)
  const chatMap = new Map()
  for (const chat of allChats) {
    const participantEmail = chat.participant_email
    if (!chatMap.has(participantEmail)) {
      chatMap.set(participantEmail, chat)
    } else {
      // ถ้ามีแชทเดิมแล้ว ให้เปรียบเทียบว่าแชทไหนใหม่กว่า
      const existingChat = chatMap.get(participantEmail)
      const existingTime = existingChat.last_message?.created_at || existingChat.created_at
      const currentTime = chat.last_message?.created_at || chat.created_at
      if (new Date(currentTime) > new Date(existingTime)) {
        chatMap.set(participantEmail, chat)
      }
    }
  }

  // แปลง Map กลับเป็น Array และเรียงตามเวลาล่าสุด
  const uniqueChats = Array.from(chatMap.values())
  uniqueChats.sort((a, b) => {
    const timeA = new Date(a.last_message?.created_at || a.created_at)
    const timeB = new Date(b.last_message?.created_at || b.created_at)
    return timeB - timeA
  })
  console.log('[chat:getChats] uniqueChats.length =', uniqueChats.length)
  console.log('[chat:getChats] first unique chat =', uniqueChats[0])

  return res.json(uniqueChats)
  } catch (err) {
    if (err.message?.includes('timeout') || err.code === 'ETIMEDOUT') {
      console.error('Chats DB timeout:', err.message)
      return res.status(503).json(serviceUnavailable('Service temporarily unavailable. Please try again.'))
    }
    console.error('getChats error:', err.message)
    return res.status(500).json(internalError('Failed to load chats'))
  }
}

export const getChatMessages = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  const { chatId } = req.params

  const membership = await query(
    `SELECT 1 FROM chats WHERE id=$1 AND (creator_id=$2 OR participant_id=$2)`,
    [chatId, req.user.id]
  )

  if (!membership.rowCount) {
    return res.status(403).json(forbidden('You do not have access to this chat'))
  }

  const result = await query(
    `SELECT 
      m.id,
      m.chat_id,
      m.sender_id,
      m.body,
      m.image_url,
      m.read_at,
      m.created_at,
      CASE WHEN m.sender_id = $2 THEN true ELSE false END as is_sent_by_me
     FROM messages m
     WHERE m.chat_id = $1 AND m.deleted_at IS NULL
     ORDER BY m.created_at ASC`,
    [chatId, req.user.id]
  )
  console.log('[chat:getChatMessages] chatId =', chatId, 'rows.length =', result.rows.length)
  console.log('[chat:getChatMessages] first row =', result.rows[0])

  return res.json(result.rows)
}

export const createChat = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }

  const { participantId, participantEmail, itemId, exchangeRequestId } = req.body

  let participant = participantId
  if (!participant && participantEmail) {
    const userResult = await query('SELECT id FROM users WHERE email=$1', [participantEmail])
    if (!userResult.rowCount) {
      return res.status(404).json(notFound('Participant not found'))
    }
    participant = userResult.rows[0].id
  }

  if (!participant) {
    return res.status(400).json(badRequest('Participant is required'))
  }

  if (participant === req.user.id) {
    return res.status(400).json(badRequest('Cannot chat with yourself'))
  }

  // ตรวจสอบว่ามีแชทกับอีเมลเดียวกันอยู่แล้วหรือไม่ (ไม่สนใจ item_id หรือ exchange_request_id)
  const existing = await query(
    `SELECT id FROM chats 
     WHERE ((creator_id=$1 AND participant_id=$2) OR (creator_id=$2 AND participant_id=$1))
       AND status != 'declined'
       AND closed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [req.user.id, participant]
  )

  if (existing.rowCount) {
    const chatRow = await fetchChatById(existing.rows[0].id)
    return res.json(mapChatRow(chatRow, req.user.id))
  }

  const isExchangeChat = Boolean(exchangeRequestId)
  const isDonationChat = Boolean(req.body.donationRequestId)
  const insertResult = await query(
    `INSERT INTO chats (creator_id, participant_id, item_id, exchange_request_id, donation_request_id)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [req.user.id, participant, itemId || null, exchangeRequestId || null, req.body.donationRequestId || null]
  )

  const chatId = insertResult.rows[0].id

  // --- START: โค้ดที่แก้ไข ---
  // เราจะตั้งค่า status='active' ให้กับ *ทุก* แชททันที
  // แต่จะตั้งค่า accepted เป็น true เฉพาะแชทที่ไม่ใช่ exchange
  const updates = [
    "status='active'",
    "updated_at=NOW()"
  ];

  if (!isExchangeChat) {
    // แชททั่วไป (ที่ไม่ใช่ exchange) ให้ถือว่า "ยอมรับ" ทั้งสองฝ่ายแล้ว
    updates.push("owner_accepted=true");
    updates.push("requester_accepted=true");
  }
  
  await query(
    `UPDATE chats 
     SET ${updates.join(', ')}
     WHERE id=$1`,
    [chatId]
  )
  // --- END: โค้ดที่แก้ไข ---

  const chatRow = await fetchChatById(chatId)
  const chatForCurrentUser = mapChatRow(chatRow, req.user.id)
  const chatForParticipant = mapChatRow(chatRow, participant)

  const io = getChatServer()
  if (io) {
    io.to(participant).emit('chat:created', chatForParticipant)
    io.to(participant).emit('notification:new')
  }

  return res.status(201).json(chatForCurrentUser)
}

export const startChatByEmail = async (req, res) => {
  console.log('START CHAT REQUEST', { originalUrl: req.originalUrl, body: req.body, userId: req.user?.id })
  try {
    if (!req.user) {
      return res.status(401).json(unauthorized())
    }

    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const email = String(req.body.email || '').trim().toLowerCase()
    if (!email) {
      return res.status(400).json(badRequest('Email is required'))
    }

    const targetUserResult = await query('SELECT id, name, email, avatar_url FROM users WHERE lower(email) = $1 LIMIT 1', [email])
    const targetUser = targetUserResult.rows[0]
    console.log('TARGET USER', targetUser)
    if (!targetUserResult.rowCount) {
      return res.status(404).json(notFound('User not found'))
    }

    if (targetUser.id === req.user.id) {
      return res.status(400).json(badRequest('Cannot chat with yourself'))
    }

    const client = await query('BEGIN')
    try {
      const existing = await query(
        `SELECT id FROM chats
         WHERE ((creator_id=$1 AND participant_id=$2) OR (creator_id=$2 AND participant_id=$1))
           AND deleted_at IS NULL
         ORDER BY created_at DESC
         LIMIT 1`,
        [req.user.id, targetUser.id]
      )
      console.log('EXISTING CHAT', existing.rows[0] || null)

      let chatId = existing.rows[0]?.id
      if (!chatId) {
        const insertResult = await query(
          `INSERT INTO chats (creator_id, participant_id, status, owner_accepted, requester_accepted)
           VALUES ($1, $2, 'active', true, true)
           RETURNING id`,
          [req.user.id, targetUser.id]
        )
        console.log('CREATED CHAT', insertResult.rows[0] || null)
        chatId = insertResult.rows[0].id
      }

      await query('COMMIT')

      const chatRow = await fetchChatById(chatId)
      const chatForCurrentUser = mapChatRow(chatRow, req.user.id)
      const chatForParticipant = mapChatRow(chatRow, targetUser.id)
      console.log('RESPONSE SENT', chatForCurrentUser)

      const io = getChatServer()
      if (io) {
        io.to(targetUser.id).emit('chat:created', chatForParticipant)
        io.to(targetUser.id).emit('notification:new')
      }

      return res.status(existing.rowCount ? 200 : 201).json(chatForCurrentUser)
    } catch (txErr) {
      await query('ROLLBACK')
      throw txErr
    }
  } catch (err) {
    console.error('START CHAT ERROR', err)
    return res.status(500).json(internalError(err.message || 'Failed to start chat'))
  }
}

export const acceptChat = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(unauthorized())
    }

    const { chatId } = req.params
    let chatRow = await fetchChatById(chatId)

    if (!chatRow) {
      return res.status(404).json(notFound('Chat not found'))
    }

    // ตรวจสอบว่า chat ถูกปิดแล้วหรือไม่ แต่ถ้าเป็น exchange chat ที่ทั้งสองฝ่าย accept แล้ว
    // และ status ยังเป็น 'declined' อาจจะต้อง reset กลับเป็น 'active'
    if (chatRow.status === 'declined' && chatRow.closed_at) {
      // ถ้าเป็น exchange/donation chat และทั้งสองฝ่าย accept แล้ว ให้ reset กลับเป็น active
      if (chatRow.exchange_request_id) {
        const exchangeRequestResult = await query(
          `SELECT owner_accepted, requester_accepted, status 
           FROM exchange_requests 
           WHERE id=$1`,
          [chatRow.exchange_request_id]
        )
        if (exchangeRequestResult.rowCount > 0) {
          const er = exchangeRequestResult.rows[0]
          // ถ้าทั้งสองฝ่าย accept แล้ว ให้ reset chat status
          if (er.owner_accepted && er.requester_accepted && er.status === 'chatting') {
            await query(
              `UPDATE chats 
               SET status='active',
                   closed_at=NULL,
                   updated_at=NOW()
               WHERE id=$1`,
              [chatId]
            )
            chatRow = await fetchChatById(chatId)
          } else {
            return res.status(400).json(badRequest('Chat has been closed'))
          }
        } else {
          return res.status(400).json(badRequest('Chat has been closed'))
        }
      } else if (chatRow.donation_request_id) {
        const donationRequestResult = await query(
          `SELECT owner_accepted, requester_accepted, status 
           FROM donation_requests 
           WHERE id=$1`,
          [chatRow.donation_request_id]
        )
        if (donationRequestResult.rowCount > 0) {
          const dr = donationRequestResult.rows[0]
          // ถ้าทั้งสองฝ่าย accept แล้ว ให้ reset chat status
          if (dr.owner_accepted && dr.requester_accepted && dr.status === 'chatting') {
            await query(
              `UPDATE chats 
               SET status='active',
                   closed_at=NULL,
                   updated_at=NOW()
               WHERE id=$1`,
              [chatId]
            )
            chatRow = await fetchChatById(chatId)
          } else {
            return res.status(400).json(badRequest('Chat has been closed'))
          }
        } else {
          return res.status(400).json(badRequest('Chat has been closed'))
        }
      } else {
        return res.status(400).json(badRequest('Chat has been closed'))
      }
    }

    if (!chatRow.exchange_request_id && !chatRow.donation_request_id) {
      return res.status(400).json(badRequest('Chat confirmation is only available for exchange or donation chats'))
    }

    const role = resolveChatRole(chatRow, req.user.id)
    if (!role || role === 'viewer') {
      return res.status(403).json(forbidden('You are not part of this chat'))
    }

    // สำหรับ exchange chat ต้องเป็น owner หรือ requester เท่านั้น
    if (role !== 'owner' && role !== 'requester') {
      return res.status(403).json(forbidden('Only owner or requester can accept exchange chat'))
    }

    const column = role === 'owner' ? 'owner_accepted' : 'requester_accepted'
    
    // ถ้ายอมรับแล้ว ให้เช็คว่าต้องสร้าง QR code หรือไม่
    if (chatRow[column]) {
      // ถ้าทั้งสองฝ่าย accept แล้วแต่ยังไม่มี QR code ให้สร้างเลย
      if (chatRow.owner_accepted && chatRow.requester_accepted && !chatRow.qr_code) {
        try {
          const isDonationChat = Boolean(chatRow.donation_request_id)
          const qrCode = isDonationChat ? generateDonationCode() : generateExchangeCode()
          await query(
            `UPDATE chats 
             SET qr_code=$2,
                 updated_at=NOW()
             WHERE id=$1`,
            [chatId, qrCode]
          )
          chatRow = await fetchChatById(chatId)
        } catch (err) {
          console.error('Failed to generate QR code:', err)
        }
      }
      return res.json(mapChatRow(chatRow, req.user.id))
    }

    await query(
      `UPDATE chats 
       SET ${column}=TRUE,
           updated_at=NOW()
       WHERE id=$1`,
      [chatId]
    )

    chatRow = await fetchChatById(chatId)

    // --- START: โค้ดที่แก้ไข ---
    // เช็คว่าทั้งสองฝ่าย accept และ QR Code ยังไม่เคยถูกสร้าง
    if (chatRow && chatRow.owner_accepted && chatRow.requester_accepted && !chatRow.qr_code) {
      try {
        const isDonationChat = Boolean(chatRow.donation_request_id)
        const qrCode = isDonationChat ? generateDonationCode() : generateExchangeCode() // สร้าง code ใหม่เลย ไม่ต้อง check `||`
        await query(
          `UPDATE chats 
           SET qr_code=$2,
               updated_at=NOW()
           WHERE id=$1`,
          // ไม่ต้องอัปเดต status='active' เพราะมัน active อยู่แล้ว
          [chatId, qrCode]
        )
        chatRow = await fetchChatById(chatId)
        
        // เมื่อทั้งสองฝ่าย accept ใน chat แล้ว ให้เปลี่ยน item status
        if (chatRow && chatRow.exchange_request_id) {
          const exchangeRequestResult = await query(
            `SELECT er.item_id, er.owner_id, er.requester_id, i.category, i.item_condition
             FROM exchange_requests er
             JOIN items i ON er.item_id = i.id
             WHERE er.id=$1`,
            [chatRow.exchange_request_id]
          )
          if (exchangeRequestResult.rowCount > 0) {
            const exchangeData = exchangeRequestResult.rows[0]
            const itemId = exchangeData.item_id
            
            // เปลี่ยน item status เป็น 'exchanged' (หายจากหน้าฟีด)
            await query(
              `UPDATE items 
               SET status='exchanged', updated_at=NOW()
               WHERE id=$1`,
              [itemId]
            )
            
            // อัปเดต exchange_request status เป็น 'in_progress'
            await query(
              `UPDATE exchange_requests 
               SET status='in_progress', updated_at=NOW()
               WHERE id=$1`,
              [chatRow.exchange_request_id]
            )
            
            // สร้าง exchange history (ถ้ายังไม่มี)
            const existingHistory = await query(
              `SELECT id FROM exchange_history WHERE exchange_request_id=$1`,
              [chatRow.exchange_request_id]
            )
            
            if (!existingHistory.rowCount) {
              // คำนวณ CO₂ footprint
              const co2OwnerItem = calculateItemCO2(exchangeData.category, exchangeData.item_condition)
              const co2Reduced = co2OwnerItem * 0.75
              
              // สร้าง exchange history
              await query(
                `INSERT INTO exchange_history (exchange_request_id, item_id, owner_id, requester_id, co2_reduced)
                 VALUES ($1,$2,$3,$4,$5)`,
                [chatRow.exchange_request_id, itemId, exchangeData.owner_id, exchangeData.requester_id, parseFloat(co2Reduced.toFixed(2))]
              )
              
              // Emit socket event for real-time update
              const io = getChatServer()
              if (io) {
                io.emit('exchange:completed')
              }
            }
          }
        } else if (chatRow && chatRow.donation_request_id) {
          // สำหรับ donation requests - ทำเหมือน exchange
          const donationRequestResult = await query(
            `SELECT dr.item_id, dr.requester_id, i.user_id as owner_id, i.category, i.item_condition
             FROM donation_requests dr
             JOIN items i ON dr.item_id = i.id
             WHERE dr.id=$1`,
            [chatRow.donation_request_id]
          )
          if (donationRequestResult.rowCount > 0) {
            const donationData = donationRequestResult.rows[0]
            const itemId = donationData.item_id
            
            // เปลี่ยน item status เป็น 'in_progress' (เหมือน exchange)
            await query(
              `UPDATE items 
               SET status='in_progress', updated_at=NOW()
               WHERE id=$1`,
              [itemId]
            )
            
            // อัปเดต donation_request status เป็น 'in_progress' (เหมือน exchange)
            await query(
              `UPDATE donation_requests 
               SET status='in_progress', updated_at=NOW()
               WHERE id=$1`,
              [chatRow.donation_request_id]
            )
          }
        }
      } catch (err) {
        console.error('Failed to generate QR code or update item status:', err)
        // ไม่ throw error เพื่อไม่ให้การ accept ล้มเหลว
      }
    }
    // --- END: โค้ดที่แก้ไข ---

    try {
      if (chatRow) {
        broadcastChatUpdate(chatRow)
      }
    } catch (err) {
      console.error('Failed to broadcast chat update:', err)
      // ไม่ throw error เพื่อไม่ให้การ accept ล้มเหลว
    }

    if (!chatRow) {
      return res.status(500).json(internalError('Failed to fetch updated chat'))
    }

    return res.json(mapChatRow(chatRow, req.user.id))
  } catch (err) {
    console.error('Accept chat error:', err)
    return res.status(500).json(internalError())
  }
}

export const deleteChat = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  const { chatId } = req.params
  const membership = await query(
    `SELECT id FROM chats WHERE id=$1 AND (creator_id=$2 OR participant_id=$2) AND deleted_at IS NULL`,
    [chatId, req.user.id]
  )

  if (!membership.rowCount) {
    return res.status(404).json(notFound('Chat not found'))
  }

  await query(
    `UPDATE chats SET deleted_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [chatId]
  )

  return res.json({ success: true, chatId })
}

export const declineChat = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  const { chatId } = req.params
  let chatRow = await fetchChatById(chatId)

  if (!chatRow) {
    return res.status(404).json(notFound('Chat not found'))
  }

  const role = resolveChatRole(chatRow, req.user.id)
  if (!role || role === 'viewer') {
    return res.status(403).json(forbidden('You are not part of this chat'))
  }

  if (chatRow.status === 'declined' || chatRow.status === 'closed') {
    return res.json(mapChatRow(chatRow, req.user.id))
  }

  const column = role === 'owner' ? 'owner_accepted' : role === 'requester' ? 'requester_accepted' : null

  const updates = [
    "status='declined'",
    'closed_at=NOW()',
    'updated_at=NOW()',
  ]

  if (column) {
    updates.push(`${column}=FALSE`)
  }

  await query(`UPDATE chats SET ${updates.join(', ')} WHERE id=$1`, [chatId])

  chatRow = await fetchChatById(chatId)
  
  // เมื่อ reject ใน chat ให้เปลี่ยน item status กลับเป็น 'active' และ request status กลับเป็น 'pending'
  if (chatRow && chatRow.exchange_request_id) {
    try {
      const exchangeRequestResult = await query(
        `SELECT item_id FROM exchange_requests WHERE id=$1`,
        [chatRow.exchange_request_id]
      )
      if (exchangeRequestResult.rowCount > 0) {
        const itemId = exchangeRequestResult.rows[0].item_id
        // เปลี่ยน item status กลับเป็น 'active'
        await query(
          `UPDATE items 
           SET status='active', updated_at=NOW()
           WHERE id=$1`,
          [itemId]
        )
        // เปลี่ยน exchange_request status กลับเป็น 'pending'
        await query(
          `UPDATE exchange_requests 
           SET status='pending', 
               owner_accepted=FALSE,
               requester_accepted=FALSE,
               updated_at=NOW()
           WHERE id=$1`,
          [chatRow.exchange_request_id]
        )
      }
    } catch (err) {
      console.error('Failed to revert item status:', err)
      // ไม่ throw error เพื่อไม่ให้การ decline ล้มเหลว
    }
  } else if (chatRow && chatRow.donation_request_id) {
    try {
      const donationRequestResult = await query(
        `SELECT item_id FROM donation_requests WHERE id=$1`,
        [chatRow.donation_request_id]
      )
      if (donationRequestResult.rowCount > 0) {
        const itemId = donationRequestResult.rows[0].item_id
        // เปลี่ยน item status กลับเป็น 'active'
        await query(
          `UPDATE items 
           SET status='active', updated_at=NOW()
           WHERE id=$1`,
          [itemId]
        )
        // เปลี่ยน donation_request status กลับเป็น 'pending'
        await query(
          `UPDATE donation_requests 
           SET status='pending', 
               owner_accepted=FALSE,
               requester_accepted=FALSE,
               updated_at=NOW()
           WHERE id=$1`,
          [chatRow.donation_request_id]
        )
      }
    } catch (err) {
      console.error('Failed to revert donation item status:', err)
      // ไม่ throw error เพื่อไม่ให้การ decline ล้มเหลว
    }
  }
  
  broadcastChatUpdate(chatRow)
  return res.json(mapChatRow(chatRow, req.user.id))
}

export const confirmChatQr = async (req, res) => {
  if (!req.user) {
    return res.status(401).json(unauthorized())
  }

  const { chatId } = req.params
  const { code } = req.body

  if (!code) {
    return res.status(400).json(badRequest('QR code is required'))
  }

  let chatRow = await fetchChatById(chatId)

  if (!chatRow) {
    return res.status(404).json(notFound('Chat not found'))
  }

  const role = resolveChatRole(chatRow, req.user.id)
  if (role !== 'requester') {
    return res.status(403).json(forbidden('Only the requester can confirm the QR code'))
  }

  if (chatRow.status !== 'active') {
    return res.status(400).json(badRequest('Chat is not ready for QR confirmation'))
  }

  if (!chatRow.qr_code) {
    return res.status(400).json(badRequest('QR code not generated yet'))
  }

  if (chatRow.qr_confirmed) {
    return res.json(mapChatRow(chatRow, req.user.id))
  }

  if (chatRow.qr_code !== code.trim()) {
    return res.status(400).json(badRequest('รหัสไม่ถูกต้อง กรุณาลองใหม่'))
  }

  // อัปเดต QR confirmed แต่ไม่ปิดแชท เพื่อให้ยังสามารถส่งข้อความได้
  await query(
    `UPDATE chats 
     SET qr_confirmed=TRUE,
         qr_confirmed_at=NOW(),
         updated_at=NOW()
     WHERE id=$1`,
    [chatId]
  )

  // สร้าง exchange history เมื่อยืนยัน QR code (ถ้ายังไม่มี)
  if (chatRow.exchange_request_id) {
    try {
      const existingHistory = await query(
        `SELECT id FROM exchange_history WHERE exchange_request_id=$1`,
        [chatRow.exchange_request_id]
      )
      
      if (!existingHistory.rowCount) {
        // ดึงข้อมูล exchange request และ items
        const exchangeRequestResult = await query(
          `SELECT 
            er.item_id,
            er.requester_id,
            er.requester_item_category,
            er.requester_item_condition,
            i.user_id as owner_id,
            i.category as owner_item_category,
            i.item_condition as owner_item_condition
           FROM exchange_requests er
           JOIN items i ON er.item_id = i.id
           WHERE er.id=$1`,
          [chatRow.exchange_request_id]
        )
        
        if (exchangeRequestResult.rowCount > 0) {
          const exchangeData = exchangeRequestResult.rows[0]
          
          // คำนวณ CO₂ footprint ของทั้งสอง items
          const co2OwnerItem = calculateItemCO2(
            exchangeData.owner_item_category,
            exchangeData.owner_item_condition
          )
          const co2RequesterItem = exchangeData.requester_item_category && exchangeData.requester_item_condition
            ? calculateItemCO2(
                exchangeData.requester_item_category,
                exchangeData.requester_item_condition
              )
            : co2OwnerItem // ถ้าไม่มี requester item ให้ใช้ค่าเดียวกับ owner item
          
          // คำนวณ CO₂ ที่ลดได้
          const co2Reduced = calculateExchangeCO2Reduction(co2OwnerItem, co2RequesterItem)
          
          // สร้าง exchange history
          await query(
            `INSERT INTO exchange_history (exchange_request_id, item_id, owner_id, requester_id, co2_reduced)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              chatRow.exchange_request_id,
              exchangeData.item_id,
              exchangeData.owner_id,
              exchangeData.requester_id,
              parseFloat(co2Reduced.toFixed(2))
            ]
          )
          
          // ให้แต้มสะสมทั้งสองฝ่าย
          const insertedHistory = await query(
            `SELECT id FROM exchange_history WHERE exchange_request_id=$1 ORDER BY created_at DESC LIMIT 1`,
            [chatRow.exchange_request_id]
          )
          if (insertedHistory.rowCount > 0) {
            await awardExchangePoints(
              exchangeData.owner_id,
              exchangeData.requester_id,
              insertedHistory.rows[0].id,
              parseFloat(co2Reduced.toFixed(2))
            )
          }

          // Emit socket event for real-time update
          const io = getChatServer()
          if (io) {
            io.emit('exchange:completed')
          }
          
          // อัปเดต item status เป็น 'exchanged'
          await query(
            `UPDATE items SET status='exchanged', updated_at=NOW() WHERE id=$1`,
            [exchangeData.item_id]
          )
          
          // อัปเดต exchange_request status เป็น 'completed'
          await query(
            `UPDATE exchange_requests SET status='completed', updated_at=NOW() WHERE id=$1`,
            [chatRow.exchange_request_id]
          )
        }
      }
    } catch (err) {
      console.error('Failed to create exchange history:', err)
      // ไม่ throw error เพื่อไม่ให้การยืนยัน QR ล้มเหลว
    }
  }

  // สร้าง donation history เมื่อยืนยัน QR code สำหรับ donation (ถ้ายังไม่มี)
  if (chatRow.donation_request_id) {
    try {
      const existingHistory = await query(
        `SELECT id FROM donation_history WHERE recipient_id=$1 AND item_id IN (SELECT item_id FROM donation_requests WHERE id=$2)`,
        [req.user.id, chatRow.donation_request_id]
      )
      
      if (!existingHistory.rowCount) {
        // ดึงข้อมูล donation request และ item
        const donationRequestResult = await query(
          `SELECT
            dr.item_id,
            dr.requester_id,
            i.user_id as owner_id,
            i.category as item_category,
            i.item_condition as item_condition,
            i.title as item_title,
            owner.name as owner_name,
            owner.email as owner_email,
            requester.name as requester_name,
            requester.email as requester_email
           FROM donation_requests dr
           JOIN items i ON dr.item_id = i.id
           JOIN users owner ON i.user_id = owner.id
           JOIN users requester ON dr.requester_id = requester.id
           WHERE dr.id=$1`,
          [chatRow.donation_request_id]
        )
        
        if (donationRequestResult.rowCount > 0) {
          const donationData = donationRequestResult.rows[0]
          
          // คำนวณ CO₂ footprint ของ item
          const co2Footprint = calculateItemCO2(
            donationData.item_category,
            donationData.item_condition
          )
          const co2Reduced = co2Footprint * 0.8 // 80% reduction
          
          // สร้าง donation history
          await query(
            `INSERT INTO donation_history (item_id, donor_id, recipient_id, co2_reduced)
             VALUES ($1, $2, $3, $4)`,
            [
              donationData.item_id,
              donationData.owner_id, // donor_id = เจ้าของโพสต์
              donationData.requester_id, // recipient_id = ผู้รับบริจาค
              parseFloat(co2Reduced.toFixed(2))
            ]
          )
          
          // ให้แต้มสะสม ผู้ให้ + ผู้รับ
          const insertedDonation = await query(
            `SELECT id FROM donation_history WHERE item_id=$1 AND recipient_id=$2 ORDER BY created_at DESC LIMIT 1`,
            [donationData.item_id, donationData.requester_id]
          )
          if (insertedDonation.rowCount > 0) {
            await awardDonationPoints(
              donationData.owner_id,
              donationData.requester_id,
              insertedDonation.rows[0].id,
              parseFloat(co2Reduced.toFixed(2))
            )
          }

          // อัปเดต item status เป็น 'donated'
          await query(
            `UPDATE items SET status='donated', updated_at=NOW() WHERE id=$1`,
            [donationData.item_id]
          )
          
               // อัปเดต donation_request status เป็น 'completed'
               await query(
                 `UPDATE donation_requests SET status='completed', updated_at=NOW() WHERE id=$1`,
                 [chatRow.donation_request_id]
               )
               
               // Emit socket event for real-time update
               const io = getChatServer()
               if (io) {
                 io.emit('donation:completed')
               }

               // ส่งอีเมลแจ้งการบริจาคสำเร็จจริง (ยืนยันในแชทแล้ว)
               try {
                 const ownerTpl = donationCompletedEmail({
                   recipientName: donationData.owner_name,
                   itemTitle: donationData.item_title,
                 })
                 const requesterTpl = donationCompletedEmail({
                   recipientName: donationData.requester_name,
                   itemTitle: donationData.item_title,
                 })
                 await Promise.all([
                   sendEmail({ to: donationData.owner_email, ...ownerTpl }),
                   sendEmail({ to: donationData.requester_email, ...requesterTpl }),
                 ])
               } catch (emailErr) {
                 console.error('Donation completed emails failed:', emailErr.message)
               }
             }
           }
         } catch (err) {
           console.error('Failed to create donation history:', err)
      // ไม่ throw error เพื่อไม่ให้การยืนยัน QR ล้มเหลว
    }
  }

  chatRow = await fetchChatById(chatId)
  broadcastChatUpdate(chatRow)
  return res.json(mapChatRow(chatRow, req.user.id))
}

async function fetchChatById(chatId) {
  const result = await query(
    `
    SELECT 
      c.*,
      creator.name AS creator_name,
      creator.email AS creator_email,
      creator.avatar_url AS creator_avatar_url,
      participant.name AS participant_name,
      participant.email AS participant_email,
      participant.avatar_url AS participant_avatar_url,
      item.id AS item_resolved_id,
      item.title AS item_title,
      item.pickup_location AS item_pickup_location,
      item.image_url AS item_image_url,
      item.user_id AS item_owner_id,
      er.requester_id AS exchange_request_requester_id,
      er.status AS exchange_request_status,
      dr.requester_id AS donation_request_requester_id,
      dr.status AS donation_request_status,
      last_message.id AS last_message_id,
      last_message.body AS last_message_body,
      last_message.sender_id AS last_message_sender_id,
      last_message.created_at AS last_message_created_at
    FROM chats c
    JOIN users creator ON c.creator_id = creator.id
    JOIN users participant ON c.participant_id = participant.id
    LEFT JOIN exchange_requests er ON c.exchange_request_id = er.id
    LEFT JOIN donation_requests dr ON c.donation_request_id = dr.id
    LEFT JOIN items item ON COALESCE(c.item_id, er.item_id, dr.item_id) = item.id
    LEFT JOIN LATERAL (
      SELECT m.id, m.body, m.sender_id, m.image_url, m.created_at
      FROM messages m
      WHERE m.chat_id = c.id AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_message ON TRUE
    WHERE c.id = $1 AND c.deleted_at IS NULL
      AND creator.deleted_at IS NULL
      AND participant.deleted_at IS NULL
    `,
    [chatId]
  )

  return result.rows[0]
}

async function fetchChatsForUser(userId) {
  const result = await query(
    `
    SELECT 
      c.*,
      creator.name AS creator_name,
      creator.email AS creator_email,
      creator.avatar_url AS creator_avatar_url,
      participant.name AS participant_name,
      participant.email AS participant_email,
      participant.avatar_url AS participant_avatar_url,
      item.id AS item_resolved_id,
      item.title AS item_title,
      item.pickup_location AS item_pickup_location,      
      item.image_url AS item_image_url,
      item.user_id AS item_owner_id,
      er.requester_id AS exchange_request_requester_id,
      er.status AS exchange_request_status,
      dr.requester_id AS donation_request_requester_id,
      dr.status AS donation_request_status,
      last_message.id AS last_message_id,
      last_message.body AS last_message_body,
      last_message.sender_id AS last_message_sender_id,
      last_message.created_at AS last_message_created_at
    FROM chats c
    JOIN users creator ON c.creator_id = creator.id
    JOIN users participant ON c.participant_id = participant.id
    LEFT JOIN exchange_requests er ON c.exchange_request_id = er.id
    LEFT JOIN donation_requests dr ON c.donation_request_id = dr.id
    LEFT JOIN items item ON COALESCE(c.item_id, er.item_id, dr.item_id) = item.id
    LEFT JOIN LATERAL (
      SELECT m.id, m.body, m.sender_id, m.image_url, m.created_at
      FROM messages m
      WHERE m.chat_id = c.id AND m.deleted_at IS NULL
      ORDER BY m.created_at DESC
      LIMIT 1
    ) last_message ON TRUE
    WHERE (c.creator_id = $1 OR c.participant_id = $1)
      AND c.deleted_at IS NULL
      AND creator.deleted_at IS NULL
      AND participant.deleted_at IS NULL
    ORDER BY COALESCE(last_message.created_at, c.created_at) DESC
    `,
    [userId]
  )

  return result.rows
}

function mapChatRow(row, currentUserId) {
  if (!row) return null

  const itemOwnerId = row.item_owner_id || row.creator_id
  const requesterId =
    row.exchange_request_requester_id ||
    (row.creator_id === itemOwnerId ? row.participant_id : row.creator_id)

  const isCreator = row.creator_id === currentUserId
  const participant =
    row.creator_id === currentUserId
      ? {
          id: row.participant_id,
          name: row.participant_name,
          email: row.participant_email,
          avatar_url: row.participant_avatar_url,
        }
      : {
          id: row.creator_id,
          name: row.creator_name,
          email: row.creator_email,
          avatar_url: row.creator_avatar_url,
        }

  const role = resolveChatRole(row, currentUserId)
  const status = row.status || 'pending'
  const isExchangeChat = Boolean(row.exchange_request_id)
  const isDonationChat = Boolean(row.donation_request_id)
  // สำหรับ exchange/donation chat ต้องทั้งสองฝ่ายยอมรับแล้วถึงจะแชทได้
  const bothAccepted = row.owner_accepted && row.requester_accepted
  // หลังจากยืนยัน QR แล้วไม่สามารถส่งข้อความได้อีก
  const canSendMessages = status !== 'declined' && !row.closed_at && !row.qr_confirmed && (!isExchangeChat || bothAccepted)

  return {
    id: row.id,
    creator_id: row.creator_id,
    participant_id: row.participant_id,
    item_id: row.item_id,
    exchange_request_id: row.exchange_request_id,
    created_at: row.created_at,
    updated_at: row.updated_at,
    participant_name: participant.name,
    participant_email: participant.email,
    participant_avatar_url: participant.avatar_url,
    status,
    ownerAccepted: row.owner_accepted,
    requesterAccepted: row.requester_accepted,
    ownerConfirmed: Boolean(row.owner_confirmed),
    requesterConfirmed: Boolean(row.requester_confirmed),
    confirmedAt: row.confirmed_at || null,
    qrCode: row.qr_code,
    qrConfirmed: row.qr_confirmed,
    qrConfirmedAt: row.qr_confirmed_at,
    closedAt: row.closed_at,
    itemId: row.item_resolved_id,
    itemTitle: row.item_title,
    itemPickupLocation: row.item_pickup_location,
    itemImageUrl: row.item_image_url,
    exchangeRequestId: row.exchange_request_id,
    exchangeStatus: row.exchange_request_status,
    donationRequestId: row.donation_request_id,
    donationStatus: row.donation_request_status || null,
    role,
    isExchangeChat,
    isDonationChat,
    canSendMessages,
    last_message: row.last_message_id
      ? {
          id: row.last_message_id,
          body: row.last_message_body,
          image_url: row.last_message_image_url,
          sender_id: row.last_message_sender_id,
          created_at: row.last_message_created_at,
        }
      : null,
    messages: [],
    updatedAt: row.updated_at,
  }
}

function resolveChatRole(row, userId) {
  const itemOwnerId = row.item_owner_id || row.creator_id
  const requesterId =
    row.exchange_request_requester_id ||
    row.donation_request_requester_id ||
    (row.creator_id === itemOwnerId ? row.participant_id : row.creator_id)

  if (row.exchange_request_id || row.donation_request_id) {
    if (userId === itemOwnerId) return 'owner'
    if (userId === requesterId) return 'requester'
    if (userId === row.creator_id) return 'creator'
    if (userId === row.participant_id) return 'participant'
    return 'viewer'
  }

  if (userId === row.creator_id) return 'creator'
  if (userId === row.participant_id) return 'participant'
  return 'viewer'
}

function broadcastChatUpdate(chatRow) {
  if (!chatRow) return
  try {
    const io = getChatServer()
    if (!io) return

    try {
      const chatForCreator = mapChatRow(chatRow, chatRow.creator_id)
      io.to(chatRow.creator_id).emit('chat:updated', chatForCreator)
    } catch (err) {
      console.error('Failed to map chat for creator:', err)
    }

    try {
      const chatForParticipant = mapChatRow(chatRow, chatRow.participant_id)
      io.to(chatRow.participant_id).emit('chat:updated', chatForParticipant)
    } catch (err) {
      console.error('Failed to map chat for participant:', err)
    }
  } catch (err) {
    console.error('Failed to broadcast chat update:', err)
  }
}

function generateExchangeCode() {
  const random = randomBytes(4).readUInt32BE(0) % 100000000
  return `EX${random.toString().padStart(8, '0')}`
}

function generateDonationCode() {
  const random = randomBytes(4).readUInt32BE(0) % 100000000
  return `DN${random.toString().padStart(8, '0')}`
}

// POST /chats/:chatId/confirm-exchange
// Both owner and requester must call this to confirm the physical exchange happened.
// When both have confirmed, the exchange is finalised automatically.
export const confirmExchange = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(unauthorized())
    }

    const { chatId } = req.params
    let chatRow = await fetchChatById(chatId)

    if (!chatRow) {
      return res.status(404).json(notFound('Chat not found'))
    }

    if (!chatRow.exchange_request_id) {
      return res.status(400).json(badRequest('This chat is not linked to an exchange request'))
    }

    const role = resolveChatRole(chatRow, req.user.id)
    if (role !== 'owner' && role !== 'requester') {
      return res.status(403).json(forbidden('Only the owner or requester can confirm this exchange'))
    }

    if (chatRow.status !== 'active') {
      return res.status(400).json(badRequest('Exchange is not in an active state yet'))
    }

    // If already fully confirmed, return current state
    if (chatRow.confirmed_at) {
      return res.json(mapChatRow(chatRow, req.user.id))
    }

    const confirmColumn = role === 'owner' ? 'owner_confirmed' : 'requester_confirmed'

    // Idempotent: if this party already confirmed, proceed to check completion
    if (!chatRow[confirmColumn]) {
      await query(
        `UPDATE chats SET ${confirmColumn}=TRUE, updated_at=NOW() WHERE id=$1`,
        [chatId]
      )
      chatRow = await fetchChatById(chatId)
    }

    const io = getChatServer()

    // Emit per-confirmation event so the other party's UI updates immediately
    if (io) {
      const forCreator    = mapChatRow(chatRow, chatRow.creator_id)
      const forParticipant = mapChatRow(chatRow, chatRow.participant_id)
      io.to(chatRow.creator_id).emit('exchange:confirmed', forCreator)
      io.to(chatRow.participant_id).emit('exchange:confirmed', forParticipant)
    }

    // Both confirmed → finalise
    if (chatRow.owner_confirmed && chatRow.requester_confirmed) {
      try {
        await finalizeExchangeConfirmation(chatRow, chatId)
        chatRow = await fetchChatById(chatId)

        if (io) {
          const forCreator    = mapChatRow(chatRow, chatRow.creator_id)
          const forParticipant = mapChatRow(chatRow, chatRow.participant_id)
          io.to(chatRow.creator_id).emit('exchange:completed', forCreator)
          io.to(chatRow.participant_id).emit('exchange:completed', forParticipant)
          io.to(chatRow.creator_id).emit('notification:new')
          io.to(chatRow.participant_id).emit('notification:new')
        }
      } catch (err) {
        console.error('[confirmExchange] Finalisation error:', err)
        // Don't fail the whole request — the confirmation flags are already set
      }
    }

    broadcastChatUpdate(chatRow)
    return res.json(mapChatRow(chatRow, req.user.id))
  } catch (err) {
    console.error('confirmExchange error:', err)
    return res.status(500).json(internalError())
  }
}

// Finalises an exchange when both parties have clicked "Confirm Exchange".
// Creates exchange_history (if needed), awards points, updates statuses.
async function finalizeExchangeConfirmation(chatRow, chatId) {
  // Mark confirmed_at
  await query(
    `UPDATE chats SET confirmed_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [chatId]
  )

  const exchangeRequestId = chatRow.exchange_request_id

  // Fetch exchange data (including user names/emails for completion email)
  const erResult = await query(
    `SELECT
       er.item_id,
       er.requester_id,
       er.requester_item_category,
       er.requester_item_condition,
       i.user_id    AS owner_id,
       i.category   AS owner_item_category,
       i.item_condition AS owner_item_condition,
       i.title      AS item_title,
       i.image_url  AS item_image_url,
       owner.name   AS owner_name,
       owner.email  AS owner_email,
       requester.name  AS requester_name,
       requester.email AS requester_email
     FROM exchange_requests er
     JOIN items i ON er.item_id = i.id
     JOIN users owner ON i.user_id = owner.id
     JOIN users requester ON er.requester_id = requester.id
     WHERE er.id=$1`,
    [exchangeRequestId]
  )

  if (!erResult.rowCount) return

  const exchangeData = erResult.rows[0]

  // Calculate CO₂ reduction
  const co2Owner = calculateItemCO2(exchangeData.owner_item_category, exchangeData.owner_item_condition)
  const co2Requester =
    exchangeData.requester_item_category && exchangeData.requester_item_condition
      ? calculateItemCO2(exchangeData.requester_item_category, exchangeData.requester_item_condition)
      : co2Owner
  const co2Reduced = parseFloat(calculateExchangeCO2Reduction(co2Owner, co2Requester).toFixed(2))

  // Create exchange_history if it doesn't exist yet
  const existingHistory = await query(
    `SELECT id FROM exchange_history WHERE exchange_request_id=$1`,
    [exchangeRequestId]
  )

  if (!existingHistory.rowCount) {
    await query(
      `INSERT INTO exchange_history (exchange_request_id, item_id, owner_id, requester_id, co2_reduced)
       VALUES ($1,$2,$3,$4,$5)`,
      [exchangeRequestId, exchangeData.item_id, exchangeData.owner_id, exchangeData.requester_id, co2Reduced]
    )
  }

  // Award points (awardExchangePoints is idempotent)
  const historyRow = await query(
    `SELECT id FROM exchange_history WHERE exchange_request_id=$1 ORDER BY created_at DESC LIMIT 1`,
    [exchangeRequestId]
  )
  if (historyRow.rowCount) {
    await awardExchangePoints(
      exchangeData.owner_id,
      exchangeData.requester_id,
      historyRow.rows[0].id,
      co2Reduced
    )
  }

  // Mark item as exchanged
  await query(
    `UPDATE items SET status='exchanged', updated_at=NOW() WHERE id=$1`,
    [exchangeData.item_id]
  )

  // Mark exchange request as completed
  await query(
    `UPDATE exchange_requests SET status='completed', updated_at=NOW() WHERE id=$1`,
    [exchangeRequestId]
  )

  // Notifications for both parties
  const notifMeta = JSON.stringify({ exchangeRequestId, chatId, itemId: exchangeData.item_id })
  await query(
    `INSERT INTO notifications (user_id, title, body, type, metadata)
     VALUES ($1,$2,$3,$4,$5), ($6,$2,$3,$4,$5)`,
    [
      exchangeData.owner_id,
      'การแลกเปลี่ยนสำเร็จแล้ว!',
      'ทั้งสองฝ่ายยืนยันการแลกเปลี่ยนแล้ว แต้มและประวัติถูกบันทึกเรียบร้อย',
      'exchange_completed',
      notifMeta,
      exchangeData.requester_id,
    ]
  )

  // Completion emails — sent only here, after both parties confirm the real-world exchange
  try {
    const co2Text = `${co2Reduced} kg`
    const ownerTpl = exchangeCompletedEmail({
      recipientName: exchangeData.owner_name,
      itemTitle: exchangeData.item_title,
      co2Text,
    })
    const requesterTpl = exchangeCompletedEmail({
      recipientName: exchangeData.requester_name,
      itemTitle: exchangeData.item_title,
      co2Text,
    })
    await Promise.all([
      sendEmail({ to: exchangeData.owner_email, ...ownerTpl }),
      sendEmail({ to: exchangeData.requester_email, ...requesterTpl }),
    ])
  } catch (emailErr) {
    console.error('Exchange completed emails failed:', emailErr.message)
  }
}

// POST /chats/:chatId/confirm-donation
// Mirrors confirmExchange — both owner (donor) and requester (recipient) must call this
// to confirm the physical hand-off happened. Finalises the donation when both have confirmed.
export const confirmDonation = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json(unauthorized())
    }

    const { chatId } = req.params
    let chatRow = await fetchChatById(chatId)

    if (!chatRow) {
      return res.status(404).json(notFound('Chat not found'))
    }

    if (!chatRow.donation_request_id) {
      return res.status(400).json(badRequest('This chat is not linked to a donation request'))
    }

    const role = resolveChatRole(chatRow, req.user.id)
    if (role !== 'owner' && role !== 'requester') {
      return res.status(403).json(forbidden('Only the donor or recipient can confirm this donation'))
    }

    if (chatRow.status !== 'active') {
      return res.status(400).json(badRequest('Donation is not in an active state yet'))
    }

    // Already fully confirmed — return current state idempotently
    if (chatRow.confirmed_at) {
      return res.json(mapChatRow(chatRow, req.user.id))
    }

    const confirmColumn = role === 'owner' ? 'owner_confirmed' : 'requester_confirmed'

    // Idempotent: only write if not yet set
    if (!chatRow[confirmColumn]) {
      await query(
        `UPDATE chats SET ${confirmColumn}=TRUE, updated_at=NOW() WHERE id=$1`,
        [chatId]
      )
      chatRow = await fetchChatById(chatId)
    }

    const io = getChatServer()

    // Notify both parties of the partial confirmation
    if (io) {
      const forCreator     = mapChatRow(chatRow, chatRow.creator_id)
      const forParticipant = mapChatRow(chatRow, chatRow.participant_id)
      io.to(chatRow.creator_id).emit('donation:confirmed', forCreator)
      io.to(chatRow.participant_id).emit('donation:confirmed', forParticipant)
    }

    // Both confirmed → finalise
    if (chatRow.owner_confirmed && chatRow.requester_confirmed) {
      try {
        await finalizeDonationConfirmation(chatRow, chatId)
        chatRow = await fetchChatById(chatId)

        if (io) {
          const forCreator     = mapChatRow(chatRow, chatRow.creator_id)
          const forParticipant = mapChatRow(chatRow, chatRow.participant_id)
          io.to(chatRow.creator_id).emit('donation:completed', forCreator)
          io.to(chatRow.participant_id).emit('donation:completed', forParticipant)
          io.to(chatRow.creator_id).emit('notification:new')
          io.to(chatRow.participant_id).emit('notification:new')
        }
      } catch (err) {
        console.error('[confirmDonation] Finalisation error:', err)
        // Don't fail the whole request — the confirmation flags are already set
      }
    }

    broadcastChatUpdate(chatRow)
    return res.json(mapChatRow(chatRow, req.user.id))
  } catch (err) {
    console.error('confirmDonation error:', err)
    return res.status(500).json(internalError())
  }
}

// Finalises a donation when both parties have clicked "Confirm Delivery".
// Creates donation_history (if needed), awards points, updates statuses, sends emails.
async function finalizeDonationConfirmation(chatRow, chatId) {
  await query(
    `UPDATE chats SET confirmed_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [chatId]
  )

  const donationRequestId = chatRow.donation_request_id

  const drResult = await query(
    `SELECT
       dr.item_id,
       dr.requester_id,
       i.user_id        AS owner_id,
       i.category       AS item_category,
       i.item_condition AS item_condition,
       i.title          AS item_title,
       owner.name       AS owner_name,
       owner.email      AS owner_email,
       requester.name   AS requester_name,
       requester.email  AS requester_email
     FROM donation_requests dr
     JOIN items i        ON dr.item_id      = i.id
     JOIN users owner    ON i.user_id       = owner.id
     JOIN users requester ON dr.requester_id = requester.id
     WHERE dr.id=$1`,
    [donationRequestId]
  )

  if (!drResult.rowCount) return

  const d = drResult.rows[0]
  const co2Footprint = calculateItemCO2(d.item_category, d.item_condition)
  const co2Reduced   = parseFloat((co2Footprint * 0.8).toFixed(2))

  // Create donation_history if not yet recorded
  const existingHistory = await query(
    `SELECT id FROM donation_history WHERE item_id=$1 AND recipient_id=$2`,
    [d.item_id, d.requester_id]
  )

  if (!existingHistory.rowCount) {
    await query(
      `INSERT INTO donation_history (item_id, donor_id, recipient_id, co2_reduced)
       VALUES ($1,$2,$3,$4)`,
      [d.item_id, d.owner_id, d.requester_id, co2Reduced]
    )
  }

  // Award points (idempotent)
  const historyRow = await query(
    `SELECT id FROM donation_history WHERE item_id=$1 AND recipient_id=$2 ORDER BY created_at DESC LIMIT 1`,
    [d.item_id, d.requester_id]
  )
  if (historyRow.rowCount) {
    await awardDonationPoints(d.owner_id, d.requester_id, historyRow.rows[0].id, co2Reduced)
  }

  // Mark item donated + donation_request completed
  await query(`UPDATE items SET status='donated', updated_at=NOW() WHERE id=$1`, [d.item_id])
  await query(`UPDATE donation_requests SET status='completed', updated_at=NOW() WHERE id=$1`, [donationRequestId])

  // Notifications for both parties
  const notifMeta = JSON.stringify({ donationRequestId, chatId, itemId: d.item_id })
  await query(
    `INSERT INTO notifications (user_id, title, body, type, metadata)
     VALUES ($1,$2,$3,$4,$5), ($6,$2,$3,$4,$5)`,
    [
      d.owner_id,
      'การบริจาคสำเร็จแล้ว!',
      'ทั้งสองฝ่ายยืนยันการส่งมอบแล้ว แต้มและประวัติถูกบันทึกเรียบร้อย',
      'donation_completed',
      notifMeta,
      d.requester_id,
    ]
  )

  // Completion emails
  try {
    const ownerTpl     = donationCompletedEmail({ recipientName: d.owner_name,     itemTitle: d.item_title })
    const requesterTpl = donationCompletedEmail({ recipientName: d.requester_name, itemTitle: d.item_title })
    await Promise.all([
      sendEmail({ to: d.owner_email,     ...ownerTpl }),
      sendEmail({ to: d.requester_email, ...requesterTpl }),
    ])
  } catch (emailErr) {
    console.error('Donation completed emails failed:', emailErr.message)
  }
}
