import { query } from "../config/db.js";

export async function writeAuditLog({
  actorUserId,
  action,
  entityType,
  entityId = null,
  requestId = null,
  metadata = {}
}) {
  await query(
    `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, request_id, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [actorUserId, action, entityType, entityId, requestId, JSON.stringify(metadata)]
  );
}
