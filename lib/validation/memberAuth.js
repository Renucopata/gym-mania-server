const { z } = require("zod");

// Member self-registration payload. Mirrors the register_member procedure
// signature (M6); the procedure re-validates email format / genero / carnet
// uniqueness as defence-in-depth.
//
// Password cap: bcrypt truncates inputs at 72 bytes, but accepting up to 128
// avoids surprising users who type long passphrases (the extra bytes are
// silently ignored at hash time, which is bcrypt's documented behaviour).
const registerMemberSchema = z.object({
  carnet_identidad: z.string().trim().min(5).max(20),
  nombre: z.string().trim().min(1).max(50),
  apellido: z.string().trim().min(1).max(50),
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(8).max(128),
  numero_celular: z.string().trim().min(5).max(15),
  fecha_nacimiento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha debe ser YYYY-MM-DD"),
  genero: z.enum(["masculino", "femenino", "otro"]),
});

const loginMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(150),
  password: z.string().min(1).max(128),
});

module.exports = { registerMemberSchema, loginMemberSchema };
