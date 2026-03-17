import { query } from '../db/pool.js'

/**
 * Log an admin action to the audit_logs table.
 * This is intentionally fire-and-forget: failures are logged but do not break the request.
 *
 * @param {Object} params
 * @param {string} params.adminId - UUID of admin performing the action
 * @param {string} params.action - Short action name, e.g. 'SUSPEND_USER'
 * @param {string} params.entityType - Entity type, e.g. 'user', 'item', 'message', 'report'
 * @param {string} [params.entityId] - UUID of affected entity (optional for global actions)
 * @param {Object} [params.metadata] - Additional JSON-serializable metadata
 */
export const logAdminAction = async ({ adminId, action, entityType, entityId = null, metadata = {} }) => {
  if (!adminId || !action || !entityType) return

  try {
    await query(
      `INSERT INTO audit_logs (admin_id, action, entity_type, entity_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [adminId, action, entityType, entityId, metadata]
    )
  } catch (err) {
    console.error('Failed to write audit log:', err.message)
  }
}

