const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const MemberAuth = require("../models/memberAuthModel");
const User = require("../models/userModel");
const {
  registerMemberSchema,
  loginMemberSchema,
} = require("../lib/validation/memberAuth");

const BCRYPT_COST = 10;
const JWT_EXPIRES_IN = "8h";

async function registerMember(req, res) {
  const parsed = registerMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: "Datos de registro inválidos.",
      issues: parsed.error.issues.map((i) => ({
        path: i.path,
        message: i.message,
      })),
    });
  }
  const data = parsed.data;

  try {
    const password_hash = await bcrypt.hash(data.password, BCRYPT_COST);
    await MemberAuth.callRegisterMember({
      carnet_identidad: data.carnet_identidad,
      nombre: data.nombre,
      apellido: data.apellido,
      email: data.email,
      password_hash,
      numero_celular: data.numero_celular,
      fecha_nacimiento: data.fecha_nacimiento,
      genero: data.genero,
    });
    return res.status(201).json({ message: "Cuenta creada con éxito." });
  } catch (err) {
    const msg = String(err.message || "");
    if (msg.includes("CARNET_EXISTS")) {
      return res
        .status(409)
        .json({ message: "Ya existe una cuenta con ese carnet." });
    }
    if (msg.includes("EMAIL_EXISTS")) {
      return res
        .status(409)
        .json({ message: "Ya existe una cuenta con ese email." });
    }
    if (msg.includes("Email inválido") || msg.includes("Género inválido")) {
      return res.status(400).json({ message: msg });
    }
    console.error("Error en registerMember:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

async function loginMember(req, res) {
  const parsed = loginMemberSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Email y contraseña son requeridos." });
  }
  const { email, password } = parsed.data;
  try {
    const row = await MemberAuth.findByEmail(email);
    // Use the same 401 message for "no such email" and "wrong password" to
    // avoid leaking which accounts exist.
    if (!row) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos." });
    }
    const ok = await bcrypt.compare(password, row.password_hash);
    if (!ok) {
      return res
        .status(401)
        .json({ message: "Email o contraseña incorrectos." });
    }
    const token = jwt.sign(
      { id: row.carnet_identidad, role: "member", email: row.email_lower },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    return res.status(200).json({
      token,
      role: "member",
      profile: {
        carnet_identidad: row.carnet_identidad,
        email: row.email_lower,
        nombre: row.nombre,
        apellido: row.apellido,
        estado: row.estado,
      },
    });
  } catch (err) {
    console.error("Error en loginMember:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

async function me(req, res) {
  if (!req.user) {
    return res.status(401).json({ message: "No autenticado." });
  }
  const role = req.user.role;

  try {
    if (role === "member") {
      const row = await MemberAuth.findByCarnet(req.user.id);
      if (!row) {
        return res.status(404).json({ message: "Perfil no encontrado." });
      }
      return res.status(200).json({ role: "member", profile: row });
    }
    if (role === "admin" || role === "employee") {
      const row = await User.findByUser(req.user.id);
      if (!row) {
        return res.status(404).json({ message: "Perfil no encontrado." });
      }
      const { contrasena_encriptada, ...safe } = row;
      return res.status(200).json({ role, profile: safe });
    }
    return res.status(403).json({ message: "Rol no soportado." });
  } catch (err) {
    console.error("Error en /api/auth/me:", err);
    return res.status(500).json({ message: "Error interno del servidor." });
  }
}

module.exports = { registerMember, loginMember, me };
