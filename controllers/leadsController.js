const Leads = require("../models/leadsModel");
const {
  contactSubmissionSchema,
  updateLeadSchema,
} = require("../lib/validation/leads");

const VALID_STATUSES = ["new", "contacted", "qualified", "closed"];

// Public endpoint. Anti-spam layers, in order of evaluation:
//   1. Rate limiter (middleware): 5/IP/hour
//   2. (Future) captcha hook — see marked block below
//   3. Honeypot `website` field — non-empty value silently "succeeds" but
//      never reaches the DB, so bots don't learn they were caught and
//      rotate their input.
async function submitContact(req, res) {
  const parsed = contactSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Datos inválidos.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }
  const data = parsed.data;

  // ---- Captcha hook (future) ----
  // if (CAPTCHA_ENABLED) {
  //   const ok = await verifyCaptcha(req.body.captchaToken, req.ip);
  //   if (!ok) return res.status(400).json({ message: "Captcha inválido." });
  // }
  // ---- end captcha hook ----

  if (data.website && data.website.trim().length > 0) {
    console.warn("[leads] honeypot triggered", {
      ip: req.ip,
      website_value_length: data.website.length,
    });
    return res
      .status(201)
      .json({ message: "Gracias. Nos pondremos en contacto pronto." });
  }

  try {
    await Leads.createSubmission({
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      mensaje: data.mensaje,
      source: data.source,
    });
    // Intentionally do NOT return submission.id to anonymous callers — no
    // need to give scrapers a handle to enumerate leads.
    return res
      .status(201)
      .json({ message: "Gracias. Nos pondremos en contacto pronto." });
  } catch (err) {
    console.error("Error en submitContact:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

// Staff endpoint. Query params: status, assigned_to (or 'unassigned'),
// limit (capped at 200), offset.
async function listLeads(req, res) {
  try {
    const { status, assigned_to } = req.query;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ message: "Status inválido." });
    }

    const rows = await Leads.listSubmissions({
      status,
      assignedTo: assigned_to,
      limit,
      offset,
    });
    return res.status(200).json({ data: rows });
  } catch (err) {
    console.error("Error en listLeads:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

async function getLead(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido." });
    }
    const row = await Leads.findById(id);
    if (!row) return res.status(404).json({ message: "Lead no encontrado." });
    return res.status(200).json({ data: row });
  } catch (err) {
    console.error("Error en getLead:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

async function updateLead(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID inválido." });
    }

    const parsed = updateLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Datos de actualización inválidos.",
        issues: parsed.error.issues.map((i) => ({
          path: i.path,
          message: i.message,
        })),
      });
    }

    const updated = await Leads.update(id, parsed.data);
    if (!updated) {
      return res.status(404).json({ message: "Lead no encontrado." });
    }
    return res.status(200).json({ message: "Lead actualizado.", data: updated });
  } catch (err) {
    if (err.code === "INVALID_UPDATE_BODY") {
      return res
        .status(400)
        .json({ message: "No hay campos válidos para actualizar." });
    }
    // FK violation on assigned_to — referenced personal row doesn't exist.
    if (err.code === "23503") {
      return res
        .status(400)
        .json({ message: "El empleado asignado no existe." });
    }
    console.error("Error en updateLead:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

module.exports = { submitContact, listLeads, getLead, updateLead };
