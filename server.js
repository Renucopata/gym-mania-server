const express = require("express");
const cors = require('cors');
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const memberAuthRoutes = require("./routes/memberAuthRoutes");
const clientsRoutes = require("./routes/clientsRoutes");
const attendancesRoutes = require("./routes/attendancesRoutes");
const membershipRoutes = require("./routes/membershipRoutes");
const reportsRoutes = require("./routes/reportsRoutes");
const leadsRoutes = require("./routes/leadsRoutes");
const authToken = require("./middlewares/authToken");

require('dotenv').config();

// Fail fast: JWT is required in EVERY environment (not just production).
// Placed before the Express app is created so a misconfigured deploy fails
// immediately at boot rather than at the first authenticated request.
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.trim() === "") {
    throw new Error(
        "JWT_SECRET environment variable is required. Set it in .env " +
        "(generate with: openssl rand -base64 32)."
    );
}

// CORS configuration — allowed origins come from the comma-separated
// ALLOWED_ORIGINS env var. No origins are hardcoded.
const parseAllowedOrigins = () => {
    const raw = process.env.ALLOWED_ORIGINS;
    if (raw && raw.trim() !== "") {
        return raw
            .split(",")
            .map((o) => o.trim())
            .filter((o) => o !== "");
    }
    if (process.env.NODE_ENV === "production") {
        throw new Error(
            "ALLOWED_ORIGINS is not set. In production you must define a " +
            "comma-separated list of allowed CORS origins (e.g. " +
            "ALLOWED_ORIGINS=https://smash-gym.netlify.app,https://smashgym.com)."
        );
    }
    // Development default: Vite (5173) and Next.js (3000) dev servers.
    return ["http://localhost:5173", "http://localhost:3000"];
};

const allowedOrigins = parseAllowedOrigins();

const corsOptions = {
    origin: (origin, callback) => {
        callback(null, allowedOrigins.includes(origin));
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true,
  };
const app = express();

// Vercel terminates HTTPS at its edge and forwards the real client IP in
// x-forwarded-for. Trust the first hop so express-rate-limit (and req.ip
// generally) reads the real IP instead of Vercel's proxy address.
app.set("trust proxy", 1);

// Error handling middleware
const errorHandler = (err, req, res, next) => {
    // Always log the full error (incl. stack) server-side.
    console.error(err.stack);
    const isProduction = process.env.NODE_ENV === "production";
    res.status(500).json({
        error: 'Something went wrong!',
        // Don't leak internal/DB error details to clients in production.
        message: isProduction ? "Internal server error." : err.message
    });
};

// Security headers. Default helmet config is appropriate for a JSON API —
// no CSP needed since we serve no HTML. Mounted first so every response
// (including 4xx/5xx from later middleware) carries the headers.
app.use(helmet());

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes reachable without a JWT. Staff registration is intentionally NOT
// public: the actual route is POST /api/auth/registerUser and it requires a
// valid token (admins create staff). It will be further restricted to the
// admin role once RBAC lands in Phase 1c.
const PUBLIC_ROUTES = [
    "/api/auth/login",
    "/api/auth/member/register",
    "/api/auth/member/login",
    "/api/leads/contact",
    "/api",
    "/" // Adding root path as public
];

// Apply authentication middleware globally
app.use((req, res, next) => {
    if (PUBLIC_ROUTES.includes(req.path)) {
        return next();
    }
    authToken(req, res, next);
});

// Root route with server info
app.get("/", (req, res) => {
    res.json({
        status: "ok",
        service: "smash-gym-api",
        timestamp: new Date().toISOString()
    });
});

// Test API with error handling
app.get("/api", (req, res, next) => {
    try {
        res.json({ "test": ["1", "2", "5"] });
    } catch (error) {
        next(error);
    }
});

// Routes
app.use("/api/auth", authRoutes);
// Mounted AFTER authRoutes so existing staff paths (/login, /registerUser,
// etc.) resolve first. Member-auth paths (/member/register, /member/login,
// /me) are non-overlapping with the staff router.
app.use("/api/auth", memberAuthRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/attendances", attendancesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/leads", leadsRoutes);

// Error handling should be after all routes
app.use(errorHandler);

// 404 handler - should be after all valid routes
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.url} not found`
    });
});

// Export the app for Vercel
module.exports = app;

// Start the server
const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
