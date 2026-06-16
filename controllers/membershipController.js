const Membership = require("../models/membershipModel");

// Get all memberships
const getAllMemberships = async (req, res) => {
  try {
    const memberships = await Membership.getAll();
    res.status(200).json({ message: "Memberships retrieved successfully", data: memberships });
  } catch (error) {
    console.error("Error retrieving memberships:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get membership by ID
const getMembershipById = async (req, res) => {
  const { ci } = req.params;
  try {
    const memberships = await Membership.getById(ci);
    console.log(memberships[0])
    if (memberships.length === 0) {
      return res.status(404).json({ error: "Memberships not found for this person" });
    }
    res.status(200).json({ message: "Membership retrieved successfully", data: memberships });
  } catch (error) {
    console.error("Error retrieving membership by CI:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Get membership by ID
const getOneMembership = async (req, res) => {
  const { id } = req.params;
  try {
    const memberships = await Membership.getOneById(id);
    console.log(memberships[0])
    if (memberships.length === 0) {
      return res.status(404).json({ error: "Membership not found for this person" });
    }
    res.status(200).json({ message: "Membership retrieved successfully", data: memberships });
  } catch (error) {
    console.error("Error retrieving membership by CI:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Create a new membership
const createMembership = async (req, res) => {
  const { ci, start, end, amount, method, subBy, type, disc, descrDisc, entries } = req.body;

  try {
    const result = await Membership.create({ ci, start, end, amount, method, subBy, type, disc, descrDisc, entries });
    console.log(result);
    res.status(201).json({ message: "Membresía añadida correctamente.", data: result });
  } catch (error) {
    console.error("Error creating membership:", error);

    if (error.message.includes("La fecha de inicio no puede ser después de la fecha fin")) {
      return res.status(400).json({ error: "La fecha de inicio no puede ser después de la fecha fin." });
    }
    if (error.message.includes("Cliente no registrado aún")) {
      return res.status(400).json({ error: "El cliente no está registrado." });
    }
    if (error.message.includes("Personal no encontrado")) {
      return res.status(400).json({ error: "El personal encargado no está registrado." });
    }
    if (error.message.includes("Ya existe una subscripción en el periodo de tiempo ingresado")) {
      return res.status(400).json({ error: "Ya existe una subscripción para esta persona en el periodo de tiempo ingresado." });
    }

    // Default error
    res.status(500).json({ error: "Ocurrió un error interno del servidor." });
  }
};


// Update a membership
const updateMembership = async (req, res) => {
  const { id } = req.params;

  if (!/^\d+$/.test(id) || Number(id) <= 0) {
    return res
      .status(400)
      .json({ error: "El id de la subscripción debe ser un entero positivo." });
  }

  try {
    const updated = await Membership.update(Number(id), req.body);
    if (!updated) {
      return res.status(404).json({ error: "Subscripción no encontrada." });
    }
    res
      .status(200)
      .json({ message: "Membresía actualizada correctamente.", data: updated });
  } catch (error) {
    console.error("Error updating membership:", error);
    if (
      error.code === "DISALLOWED_UPDATE_FIELDS" ||
      error.code === "INVALID_UPDATE_BODY"
    ) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: "Internal server error" });
  }
};

// Delete a membership
const deleteMembership = async (req, res) => {
  const { id } = req.params;

  try {

    const result = await Membership.remove(id);
    
    
    res.status(201).json({ message: "Membresia eliminada exitosamente" });
   
    
  } catch (error) {
    console.error("Error deleting membership:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  getAllMemberships,
  getMembershipById,
  createMembership,
  updateMembership,
  deleteMembership,
  getOneMembership,
};
