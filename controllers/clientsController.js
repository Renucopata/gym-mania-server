const Client = require("../models/clientModel");

// Get all clients
const getClients = async (req, res) => {
  try {
    const clients = await Client.getAll();
    res.status(200).json({ message: "Clients retrieved successfully", data: clients });
  } catch (error) {
    console.error("Error retrieving clients:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
// Get One clients
const getOneClient = async (req, res) => {
    const { ci } = req.params;
    try {
      const clients = await Client.getOne(ci);
      res.status(200).json({ message: "Client retrieved successfully", data: clients });
    } catch (error) {
      console.error("Error retrieving clients:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  };

// Add a new client
const addClient = async (req, res) => {
    const { ci, name, lastName, email, cell, bday, gnre, emergCntc, emergCell, photo, status } = req.body;
  
    try {

      // Create the new client
      const newClient = await Client.create({ ci, name, lastName, email, cell, bday, gnre, emergCntc, emergCell, photo, status });
      res.status(201).json({ message: "Cliente añadido correctamente.", data: newClient });
    } catch (error) {
      console.error("Error adding client:", error);
  
      // Handle specific errors based on their messages
      if (error.message.includes("Carnet de identidad es un campo requerido")) {
        return res.status(400).json({ error: "Carnet de identidad es un campo requerido." });
      }
      if (error.message.includes("Nombre es un campo requerido")) {
        return res.status(400).json({ error: "Nombre es un campo requerido." });
      }
      if (error.message.includes("Apellido es un campo requerido")) {
        return res.status(400).json({ error: "Apellido es un campo requerido." });
      }
      if (error.message.includes("Número de celular es un campo requerido y debe ser válido")) {
        return res.status(400).json({ error: "Número de celular es un campo requerido y debe ser válido." });
      }
      if (error.message.includes("Fecha de nacimiento no puede ser una fecha futura")) {
        return res.status(400).json({ error: "Fecha de nacimiento no puede ser una fecha futura." });
      }
      if (error.message.includes("Ya existe un cliente con este carnet de identidad")) {
        return res.status(400).json({ error: "Ya existe un cliente con este carnet de identidad." });
      }
  
      // Handle unexpected errors
      res.status(500).json({ error: "Ocurrió un error al intentar añadir el cliente. Por favor, inténtelo de nuevo más tarde." });
    }
  };

  // Upload a tryday
const updateTryDay = async (req, res) => {
    const { ci } = req.params;
  
    try {
      await Client.tryDay(ci);
      res.status(200).json({ message: "Dia de prueba registrado!" });
    } catch (error) {
      console.error("Error updating day:", error);
      if (error.message.includes("El día de prueba ya fue utilizado")) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Ocurrió un error al intentar añadir el dia de prueba. Por favor, inténtelo de nuevo más tarde." });
    }
  };
  

// Upload a photo
const uploadPhoto = async (req, res) => {
    const { ci } = req.params;
  
    if (!req.file) {
      return res.status(400).json({ message: "Photo is required." });
    }
  
    try {
      await Client.savePhoto(ci, req.file.buffer); // Save photo to the database
      res.status(200).json({ message: "Photo uploaded successfully." });
    } catch (error) {
      console.error("Error uploading photo:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };
  
  // Retrieve a photo
  const getPhoto = async (req, res) => {
    const { ci } = req.params;
  
    try {
      const photo = await Client.getPhoto(ci);
  
      if (!photo) {
        return res.status(404).json({ message: "Photo not found." });
      }
  
      res.set("Content-Type", "image/jpeg"); // Set content type for image
      res.send(photo); // Send the binary image data
    } catch (error) {
      console.error("Error retrieving photo:", error);
      res.status(500).json({ message: "Internal server error." });
    }
  };
  

// Update a client
const updateClient = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const updatedClient = await Client.update(id, updates);
    if (!updatedClient) {
      return res.status(404).json({ message: "Client not found" });
    }
    res.status(200).json({ message: "Client updated successfully", data: updatedClient });
  } catch (error) {
    console.error("Error updating client:", error);
    if (
      error.code === "DISALLOWED_UPDATE_FIELDS" ||
      error.code === "INVALID_UPDATE_BODY"
    ) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: "Error updating client" });
  }
};

// Delete a client (check for its utility test later)
const deleteClient = async (req, res) => {
  const {id} = req.params;

  try {
    const deleted = await Client.remove(id);
    if (!deleted) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }
    res.status(200).json({ message: "Cliente eliminado exitosamente" });
  } catch (error) {
    console.error("Error deleting client:", error);
    res.status(500).json({ message: "Error eliminando cliente" });
  }
};

module.exports = { getClients, addClient,uploadPhoto, getPhoto, updateClient, deleteClient, getOneClient, updateTryDay };
