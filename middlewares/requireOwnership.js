/**
 * requireOwnership(getOwnerCi)
 *
 * Enforces that a `member` may only act on their own resources. Staff
 * (admin / employee) bypass; `lead` and any unknown role are denied.
 *
 * getOwnerCi: function(req) -> string (carnet of the resource owner)
 *   For routes where the owner is a route parameter, e.g.:
 *     app.get(
 *       '/api/members/:ci/...',
 *       requireRole(['member', 'employee', 'admin']),
 *       requireOwnership((req) => req.params.ci),
 *       handler
 *     )
 *
 * Must be mounted AFTER requireRole — relies on req.user.normalizedRole.
 */
function requireOwnership(getOwnerCi) {
  if (typeof getOwnerCi !== "function") {
    throw new Error("requireOwnership requires a function");
  }
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado." });
    }
    const role = req.user.normalizedRole || req.user.role;
    if (role === "admin" || role === "employee") {
      return next();
    }
    if (role !== "member") {
      return res.status(403).json({ message: "Acceso denegado." });
    }
    const ownerCi = getOwnerCi(req);
    if (!ownerCi || ownerCi !== req.user.id) {
      return res
        .status(403)
        .json({ message: "No tiene permiso para acceder a este recurso." });
    }
    next();
  };
}

module.exports = requireOwnership;
