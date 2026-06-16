const bcrypt = require("bcrypt");
const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

// Login User
const loginUser = async (req, res) => {
  const { user, password } = req.body;

  if (!user || !password) {
    return res.status(400).json({ message: "Email y contraseña son requeridos." });
  }

  try {
    const result = await User.findByUser(user);

    if (!result) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }

    const passwordMatch = await bcrypt.compare(password, result.contrasena_encriptada);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Contraseña incorrecta." });
    }
    // Create token
  const token = jwt.sign(
    { id: result.carnet_identidad, role: result.rol }, // Payload
    process.env.JWT_SECRET, // Secret key (set in .env)
    { expiresIn: "8h" } // Token expiration
  );
  const rol = result.rol;

    return res.status(200).json({token, rol});
 
  } catch (error) {
    console.error("Error en loginUser:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// Register User
const registerUser = async (req, res) => {
  const { ci, name, lastname, email, cel, bday, genre, emergPerson, emerContact, hireDate, status, pwd, role  } = req.body;

  if (!name || !lastname || !pwd) {
    return res.status(400).json({ message: "Todos los campos son requeridos." });
  }

  try {
    const hashedPassword = await bcrypt.hash(pwd, 10);
    const newUser = await User.create({
        ci, name, lastname, email, cel, bday, genre, emergPerson, emerContact, hireDate, status, pwd: hashedPassword, role 
    });

    res.status(201).json({
      message: "Usuario registrado exitosamente.",
      user: newUser,
    });
  } catch (error) {
    console.error("Error en registerUser:", error);
    if (error.message.includes("Carnet de Identidad no puede estar vacío")) {
      return res.status(400).json({ error: "El campo 'Carnet de Identidad' es obligatorio." });
    }
    if (error.message.includes("Nombre no puede estar vacío")) {
      return res.status(400).json({ error: "El campo 'Nombre' es obligatorio." });
    }
    if (error.message.includes("Apellido no puede estar vacío")) {
      return res.status(400).json({ error: "El campo 'Apellido' es obligatorio." });
    }
    if (error.message.includes("Contraseña no puede estar vacía")) {
      return res.status(400).json({ error: "El campo 'Contraseña' es obligatorio." });
    }
    if (error.message.includes("Rol no puede estar vacío")) {
      return res.status(400).json({ error: "El campo 'Rol' es obligatorio." });
    }
    if (error.message.includes("El empleado con este carnet de identidad ya existe")) {
      return res.status(400).json({ error: "Ya existe un empleado registrado con este Carnet de Identidad." });
    }
    if (error.message.includes("Género inválido")) {
      return res.status(400).json({ error: "El campo 'Género' debe ser 'masculino', 'femenino' u 'otro'." });
    }
    if (error.message.includes("Estado inválido")) {
      return res.status(400).json({ error: "El campo 'Estado' debe ser 'activo' o 'inactivo'." });
    }
    if (error.message.includes("Role inválido")) {
      return res.status(400).json({ error: "El campo 'Rol' debe ser 'admin' o 'employee'." });
    }
    
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// Get all employees
const getEmployees = async (req, res) => {
  try {
    const users = await User.getAll();
    res.status(200).json({ message: "Employees retrieved successfully", data: users });
  } catch (error) {
    console.error("Error retrieving employees:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getOne = async (req, res) => {
  const {ci} = req.params;
  try {
    const users = await User.getByCi(ci);
    res.status(200).json({ message: "Employee retrieved successfully", data: users });
  } catch (error) {
    console.error("Error retrieving employee:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const getShift = async (req, res) => {
  const {ci} = req.params;
  try {
    const users = await User.getShift(ci);
    res.status(200).json({ message: "Shift retrieved successfully", data: users });
  } catch (error) {
    console.error("Error retrieving shift:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const addShift = async (req, res) => {
  const {ci, days, entrance, exit} = req.body;
  try {
    const users = await User.addShift({ci, days, entrance, exit});
    res.status(200).json({ message: "Turno añadido exitosamente", data: users });
  } catch (error) {
    console.error("Error adding shift:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteShift = async (req, res) => {
  const {id} = req.params;
  try {
    const users = await User.removeShift(id);
    res.status(200).json({ message: "Turno eliminado exitosamente", data: users });
  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

const deleteEmployee = async (req, res) => {
  const {id} = req.params;
  try {
    const users = await User.removeEmployee(id);
    res.status(200).json({ message: "Persona eliminada exitosamente", data: users });
  } catch (error) {
    console.error("Error deleting shift:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};



module.exports = { loginUser, registerUser, getEmployees, getOne, getShift, addShift, deleteShift, deleteEmployee };
