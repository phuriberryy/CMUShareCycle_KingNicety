import { query } from '../../../outbound/persistence/pool.js'

/**
 * GET /api/leaderboard
 * ดึงข้อมูล leaderboard
 * Query params: type=points|co2|exchanges, period=week|month|all, limit=10
 */
export const getLeaderboard = async (req, res) => {
  try {
    const { type = 'points', period = 'all', limit = 10 } = req.query
    const safeLimit = Math.min(Math.max(parseInt(limit) || 10, 1), 50)

    let dateFilter = ''
    if (period === 'week') {
      dateFilter = `AND up.created_at >= NOW() - INTERVAL '7 days'`
    } else if (period === 'month') {
      dateFilter = `AND up.created_at >= NOW() - INTERVAL '30 days'`
    }

    let leaders = []

    if (type === 'points') {
      if (period === 'all') {
        // ใช้ cached total_points สำหรับ all-time (เร็วกว่า)
        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url, u.total_points as value
           FROM users u
           WHERE u.total_points > 0
           ORDER BY u.total_points DESC
           LIMIT $1`,
          [safeLimit]
        )
        leaders = result.rows
      } else {
        // คำนวณจาก user_points ตามช่วงเวลา
        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url,
                  COALESCE(SUM(up.points), 0)::INTEGER as value
           FROM users u
           JOIN user_points up ON up.user_id = u.id
           WHERE 1=1 ${dateFilter}
           GROUP BY u.id, u.name, u.faculty, u.avatar_url
           HAVING SUM(up.points) > 0
           ORDER BY value DESC
           LIMIT $1`,
          [safeLimit]
        )
        leaders = result.rows
      }
    } else if (type === 'co2') {
      if (period === 'all') {
        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url, 
                  u.total_co2_reduced::FLOAT as value
           FROM users u
           WHERE u.total_co2_reduced > 0
           ORDER BY u.total_co2_reduced DESC
           LIMIT $1`,
          [safeLimit]
        )
        leaders = result.rows
      } else {
        let intervalFilter = period === 'week' ? '7 days' : '30 days'

        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url,
                  COALESCE(SUM(co2_data.co2_reduced), 0)::FLOAT as value
           FROM users u
           JOIN (
             SELECT owner_id as user_id, co2_reduced, exchanged_at as completed_at FROM exchange_history
             UNION ALL
             SELECT requester_id as user_id, co2_reduced, exchanged_at as completed_at FROM exchange_history
             UNION ALL
             SELECT donor_id as user_id, co2_reduced, donated_at as completed_at FROM donation_history WHERE donor_id IS NOT NULL
             UNION ALL
             SELECT recipient_id as user_id, co2_reduced, donated_at as completed_at FROM donation_history WHERE recipient_id IS NOT NULL
           ) co2_data ON co2_data.user_id = u.id
           WHERE co2_data.completed_at >= NOW() - $2::INTERVAL
           GROUP BY u.id, u.name, u.faculty, u.avatar_url
           HAVING SUM(co2_data.co2_reduced) > 0
           ORDER BY value DESC
           LIMIT $1`,
          [safeLimit, intervalFilter]
        )
        leaders = result.rows
      }
    } else if (type === 'exchanges') {
      if (period === 'all') {
        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url, 
                  u.total_exchanges as value
           FROM users u
           WHERE u.total_exchanges > 0
           ORDER BY u.total_exchanges DESC
           LIMIT $1`,
          [safeLimit]
        )
        leaders = result.rows
      } else {
        let intervalFilter = period === 'week' ? '7 days' : '30 days'

        const result = await query(
          `SELECT u.id, u.name, u.faculty, u.avatar_url,
                  COUNT(*)::INTEGER as value
           FROM users u
           JOIN (
             SELECT owner_id as user_id, exchanged_at FROM exchange_history
             UNION ALL
             SELECT requester_id as user_id, exchanged_at FROM exchange_history
           ) eh ON eh.user_id = u.id
           WHERE eh.exchanged_at >= NOW() - $2::INTERVAL
           GROUP BY u.id, u.name, u.faculty, u.avatar_url
           HAVING COUNT(*) > 0
           ORDER BY value DESC
           LIMIT $1`,
          [safeLimit, intervalFilter]
        )
        leaders = result.rows
      }
    }

    // เพิ่ม rank
    const rankedLeaders = leaders.map((leader, index) => ({
      rank: index + 1,
      ...leader,
      value: type === 'co2' ? parseFloat(parseFloat(leader.value).toFixed(2)) : parseInt(leader.value),
    }))

    res.json({ leaders: rankedLeaders, type, period })
  } catch (err) {
    console.error('Get leaderboard error:', err)
    res.status(500).json({ message: 'Failed to fetch leaderboard' })
  }
}

/**
 * GET /api/leaderboard/faculty
 * อันดับคณะ
 */
export const getFacultyLeaderboard = async (req, res) => {
  try {
    const { type = 'co2', period = 'all' } = req.query

    let result

    if (type === 'co2') {
      result = await query(
        `SELECT u.faculty, 
                COUNT(DISTINCT u.id)::INTEGER as member_count,
                COALESCE(SUM(u.total_co2_reduced), 0)::FLOAT as total_value,
                CASE WHEN COUNT(DISTINCT u.id) > 0 
                  THEN (COALESCE(SUM(u.total_co2_reduced), 0) / COUNT(DISTINCT u.id))::FLOAT 
                  ELSE 0 
                END as avg_value
         FROM users u
         WHERE u.faculty IS NOT NULL AND u.faculty != ''
         GROUP BY u.faculty
         HAVING SUM(u.total_co2_reduced) > 0
         ORDER BY total_value DESC`
      )
    } else {
      result = await query(
        `SELECT u.faculty,
                COUNT(DISTINCT u.id)::INTEGER as member_count,
                COALESCE(SUM(u.total_points), 0)::INTEGER as total_value,
                CASE WHEN COUNT(DISTINCT u.id) > 0 
                  THEN (COALESCE(SUM(u.total_points), 0) / COUNT(DISTINCT u.id))::INTEGER 
                  ELSE 0 
                END as avg_value
         FROM users u
         WHERE u.faculty IS NOT NULL AND u.faculty != ''
         GROUP BY u.faculty
         HAVING SUM(u.total_points) > 0
         ORDER BY total_value DESC`
      )
    }

    const rankedFaculties = result.rows.map((row, index) => ({
      rank: index + 1,
      faculty: row.faculty,
      memberCount: parseInt(row.member_count),
      totalValue: type === 'co2' ? parseFloat(parseFloat(row.total_value).toFixed(2)) : parseInt(row.total_value),
      avgValue: type === 'co2' ? parseFloat(parseFloat(row.avg_value).toFixed(2)) : parseInt(row.avg_value),
    }))

    res.json({ faculties: rankedFaculties, type, period })
  } catch (err) {
    console.error('Get faculty leaderboard error:', err)
    res.status(500).json({ message: 'Failed to fetch faculty leaderboard' })
  }
}

/**
 * GET /api/leaderboard/me
 * อันดับของตัวเอง
 */
export const getMyRank = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  try {
    const { type = 'points' } = req.query

    let orderField = 'total_points'
    if (type === 'co2') orderField = 'total_co2_reduced'
    else if (type === 'exchanges') orderField = 'total_exchanges'

    // ดึงข้อมูลผู้ใช้ปัจจุบัน
    const userResult = await query(
      `SELECT id, name, faculty, avatar_url, total_points, total_co2_reduced, total_exchanges, total_donations
       FROM users WHERE id = $1`,
      [req.user.id]
    )

    if (!userResult.rowCount) {
      return res.status(404).json({ message: 'User not found' })
    }

    const user = userResult.rows[0]

    // นับอันดับ
    const rankResult = await query(
      `SELECT COUNT(*) + 1 as rank FROM users WHERE ${orderField} > $1`,
      [user[orderField] || 0]
    )
    const rank = parseInt(rankResult.rows[0].rank)

    // นับจำนวนผู้ใช้ทั้งหมด
    const totalResult = await query(`SELECT COUNT(*) as total FROM users`)
    const totalUsers = parseInt(totalResult.rows[0].total)

    // คำนวณ percentile
    const percentile = totalUsers > 1 ? Math.round(((totalUsers - rank) / (totalUsers - 1)) * 100) : 100

    // ดึงประวัติแต้มล่าสุด
    const pointsHistory = await query(
      `SELECT points, reason, created_at 
       FROM user_points 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [req.user.id]
    )

    res.json({
      rank,
      totalUsers,
      percentile,
      avatarUrl: user.avatar_url || null,
      totalPoints: parseInt(user.total_points) || 0,
      totalCO2Reduced: parseFloat(user.total_co2_reduced) || 0,
      totalExchanges: parseInt(user.total_exchanges) || 0,
      totalDonations: parseInt(user.total_donations) || 0,
      recentPoints: pointsHistory.rows,
    })
  } catch (err) {
    console.error('Get my rank error:', err)
    res.status(500).json({ message: 'Failed to fetch rank' })
  }
}
