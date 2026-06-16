const rateLimit = require("express-rate-limit");

// Limiter for the public contact-form endpoint.
// 5 submissions per IP per hour. Returns 429 with a Spanish message body.
// Relies on `app.set('trust proxy', 1)` in server.js so req.ip resolves to
// the real client IP behind Vercel's edge proxy.
const contactFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true, // emit RateLimit-* headers
  legacyHeaders: false, // suppress deprecated X-RateLimit-*
  message: {
    message:
      "Demasiadas solicitudes desde esta dirección. Intente nuevamente más tarde.",
  },
});

module.exports = { contactFormLimiter };
