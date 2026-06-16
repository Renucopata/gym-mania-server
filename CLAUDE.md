# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — run locally with nodemon (auto-reload). Requires a populated `.env`.
- `npm start` — run with plain node (`node server.js`); also how Vercel/local prod runs.
- `node config/testBd.js` — one-off DB connectivity smoke test (connects, `SELECT NOW()`, exits).
- There is **no test suite and no linter**. `npm test` is a placeholder that exits 1.

`.env` is git-ignored and required. Variables read by the code: `PORT`, `NODE_ENV`, `JWT_SECRET`, and DB config — production uses `DB_URL` (connection string, SSL on); development uses `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` (port hardcoded to 5432).

## Architecture

Express REST API for "Smash Gym", a gym-management admin system. The frontend (separate repo) is a Vite app; CORS origin is hardcoded per environment in `server.js` (`https://smash-gym.netlify.app` in prod, `http://localhost:5173` in dev). Deployed to Vercel — `server.js` both exports `app` (for `@vercel/node`, see `vercel.json`) and calls `app.listen`.

Standard three-layer flow: `routes/` → `controllers/` → `models/`. Models hold all SQL and talk directly to a shared `pg` Pool (`config/db.js`). There is no service layer.

**Business logic lives in PostgreSQL, not Node.** Writes call stored procedures (`CALL insert_nuevo_cliente`, `insert_personal`, `insert_nueva_subscripcion`, `register_attendance`, `update_dia_prueba_usado`, `insertar_turno_trabajo`). Reports read DB views (`metricas_membresias`, `metricas_asistencias`, `metricas_*_personalizado`, `analisis_cliente_membresias`). Validation (required fields, date rules, duplicate checks, membership expiry/entry limits) is enforced by the database, which raises exceptions with **Spanish messages**. Controllers catch these and `error.message.includes("...")` string-match each known message to a specific HTTP 400 + user-facing message; unmatched errors fall through to 500. When adding a validation, change the stored procedure and add a matching `includes()` branch in the controller. The DB schema/procedures are not in this repo.

**Auth.** JWT bearer tokens. `server.js` applies `middlewares/authToken.js` globally to every route except a `PUBLIC_ROUTES` allowlist (`/api/auth/login`, `/api/auth/register`, `/api`, `/`). Token payload is `{ id: carnet_identidad, role: rol }`, 8h expiry, signed with `JWT_SECRET`. `loginUser` verifies bcrypt-hashed passwords from the `personal` table.

**Domain model (Spanish, PK is `carnet_identidad` / national ID "CI" everywhere):**
- `cliente` — gym members. Photos stored as binary in `cliente.foto`, uploaded via multer in-memory (`middlewares/uploadPhotoMid.js`, images only, 5MB), served back with `Content-Type: image/jpeg`.
- `personal` — staff/employees, with `rol` of `admin`/`employee` (post-Phase-1b taxonomy; `insert_personal` rejects anything else). `turno_trabajo` holds their work shifts.
- `member_auth` — credentials for self-registered members (Phase 1c). FK → `cliente.carnet_identidad` (`ON DELETE CASCADE`), email stored lowercased. JWT role for these is `member`. `lead` is a reserved auth-layer role for future sales leads; no row uses it yet.
- `subscripcion` — memberships (joined to `personal` for "enrolled by", to `cliente` for member name).
- `asistencias` — attendance check-ins; `register_attendance` enforces membership validity on check-in.

## Known broken endpoints

These have code-level bugs (verify before relying on or "fixing" around them):
- `membershipController.updateMembership` uses an undefined `pool` (never imported in that file) and targets a non-existent `memberships` table; `Membership.update` in the model has the same wrong table name. The membership update route is also registered as `router.put("update/:ci", ...)` — missing the leading `/`.
- `attendanceModel.update`/`remove` reference an `attendances` table, but the real table is `asistencias`.
- `PUBLIC_ROUTES` lists `/api/auth/register`, but the actual registration route is `/api/auth/registerUser` — registration currently requires a valid token.
