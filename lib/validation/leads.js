const { z } = require("zod");

// Public contact-form payload.
// `website` is a honeypot field — bots auto-fill it; legitimate users won't
// know it exists. Accepted in the schema so the request body passes validation
// (we want bots to receive 201, not a clear "bad field" hint); the honeypot
// check itself runs in the controller.
const contactSubmissionSchema = z.object({
  nombre: z.string().trim().min(2).max(100),
  email: z.string().trim().toLowerCase().email().max(150),
  telefono: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  mensaje: z.string().trim().min(10).max(2000),
  source: z.string().trim().max(50).optional(),
  website: z.string().optional(),
});

// Staff lead-update payload. At least one of status / assigned_to must be set.
const updateLeadSchema = z
  .object({
    status: z.enum(["new", "contacted", "qualified", "closed"]).optional(),
    assigned_to: z.string().trim().min(5).max(20).nullable().optional(),
  })
  .refine(
    (data) => data.status !== undefined || data.assigned_to !== undefined,
    { message: "Debe proporcionar al menos un campo a actualizar." }
  );

module.exports = { contactSubmissionSchema, updateLeadSchema };
