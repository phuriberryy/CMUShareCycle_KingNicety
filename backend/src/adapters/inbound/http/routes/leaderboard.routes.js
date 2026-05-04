import { Router } from 'express'
import { authenticate } from '../middleware/auth.js'
import { getLeaderboard, getFacultyLeaderboard, getMyRank } from '../controllers/leaderboardController.js'

const router = Router()

// Leaderboard (public)
router.get('/', getLeaderboard)

// Faculty leaderboard (public)
router.get('/faculty', getFacultyLeaderboard)

// My rank (authenticated)
router.get('/me', authenticate, getMyRank)

export default router
