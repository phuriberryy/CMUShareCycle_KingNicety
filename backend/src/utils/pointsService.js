import { query } from '../db/pool.js'

/**
 * ตารางแต้ม:
 *   แลกเปลี่ยนสำเร็จ (ทั้ง 2 ฝ่าย)  = +15
 *   บริจาคสำเร็จ (ผู้ให้)            = +20
 *   บริจาคสำเร็จ (ผู้รับ)            = +5
 *   โพสต์รายการใหม่                  = +5
 */

const POINTS = {
  EXCHANGE_COMPLETED: 15,
  DONATION_DONOR: 20,
  DONATION_RECIPIENT: 5,
  POST_ITEM: 5,
}

/**
 * เพิ่มแต้มให้ผู้ใช้ + บันทึกประวัติ + อัพเดต total_points
 */
export async function awardPoints(userId, points, reason, referenceType = null, referenceId = null) {
  try {
    // ป้องกัน duplicate: ถ้ามี reference เดียวกันอยู่แล้ว ไม่ให้แต้มซ้ำ
    if (referenceId) {
      const existing = await query(
        `SELECT id FROM user_points WHERE user_id=$1 AND reason=$2 AND reference_id=$3`,
        [userId, reason, referenceId]
      )
      if (existing.rowCount > 0) {
        return null
      }
    }

    // บันทึกประวัติแต้ม
    const result = await query(
      `INSERT INTO user_points (user_id, points, reason, reference_type, reference_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, points, reason, referenceType, referenceId]
    )

    // อัพเดต total_points ใน users
    await query(
      `UPDATE users SET total_points = total_points + $1 WHERE id = $2`,
      [points, userId]
    )

    return result.rows[0]
  } catch (err) {
    console.error('Failed to award points:', err)
    return null
  }
}

/**
 * อัพเดต cached stats ใน users หลังจาก exchange สำเร็จ
 */
export async function updateExchangeStats(ownerId, requesterId, co2Reduced) {
  try {
    await query(
      `UPDATE users SET total_exchanges = total_exchanges + 1, total_co2_reduced = total_co2_reduced + $1 WHERE id = $2`,
      [co2Reduced, ownerId]
    )
    await query(
      `UPDATE users SET total_exchanges = total_exchanges + 1, total_co2_reduced = total_co2_reduced + $1 WHERE id = $2`,
      [co2Reduced, requesterId]
    )
  } catch (err) {
    console.error('Failed to update exchange stats:', err)
  }
}

/**
 * อัพเดต cached stats ใน users หลังจาก donation สำเร็จ
 */
export async function updateDonationStats(donorId, recipientId, co2Reduced) {
  try {
    if (donorId) {
      await query(
        `UPDATE users SET total_donations = total_donations + 1, total_co2_reduced = total_co2_reduced + $1 WHERE id = $2`,
        [co2Reduced, donorId]
      )
    }
    if (recipientId) {
      await query(
        `UPDATE users SET total_donations = total_donations + 1 WHERE id = $1`,
        [recipientId]
      )
    }
  } catch (err) {
    console.error('Failed to update donation stats:', err)
  }
}

/**
 * ให้แต้มเมื่อแลกเปลี่ยนสำเร็จ
 */
export async function awardExchangePoints(ownerId, requesterId, exchangeHistoryId, co2Reduced) {
  await awardPoints(ownerId, POINTS.EXCHANGE_COMPLETED, 'exchange_completed', 'exchange_history', exchangeHistoryId)
  await awardPoints(requesterId, POINTS.EXCHANGE_COMPLETED, 'exchange_completed', 'exchange_history', exchangeHistoryId)
  await updateExchangeStats(ownerId, requesterId, co2Reduced)
}

/**
 * ให้แต้มเมื่อบริจาคสำเร็จ
 */
export async function awardDonationPoints(donorId, recipientId, donationHistoryId, co2Reduced) {
  if (donorId) {
    await awardPoints(donorId, POINTS.DONATION_DONOR, 'donation_completed_donor', 'donation_history', donationHistoryId)
  }
  if (recipientId) {
    await awardPoints(recipientId, POINTS.DONATION_RECIPIENT, 'donation_completed_recipient', 'donation_history', donationHistoryId)
  }
  await updateDonationStats(donorId, recipientId, co2Reduced)
}

/**
 * ให้แต้มเมื่อโพสต์รายการใหม่
 */
export async function awardPostItemPoints(userId, itemId) {
  await awardPoints(userId, POINTS.POST_ITEM, 'post_item', 'item', itemId)
}

export { POINTS }
