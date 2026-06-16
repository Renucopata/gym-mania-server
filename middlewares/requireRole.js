const VALID_ROLES = new Set(["admin", "employee", "member", "lead"]);

function normalizeRole(rawRole) {
  return VALID_ROLES.has(rawRole) ? rawRole : null;
}

/**
 * requireRole(['admin']) or requireRole(['employee', 'admin'])
 *
 * Must be mounted AFTER authToken — req.user must be populated.
 *
 * Stashes the resolved role on req.user.normalizedRole so downstream
 * middleware/handlers (e.g. requireOwnership) can read it without re-checking.
 */
function requireRole(allowed) {
  if (!Array.isArray(allowed) || allowed.length === 0) {
    throw new Error("requireRole requires a non-empty array of roles");
  }
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado." });
    }
    const normalized = normalizeRole(req.user.role);
    if (!normalized || !allowed.includes(normalized)) {
      return res.status(403).json({ message: "Acceso denegado." });
    }
    req.user.normalizedRole = normalized;
    next();
  };
}

module.exports = requireRole;
