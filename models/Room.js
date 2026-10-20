const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  floor: { type: String, required: true },
  type: { type: String, required: true },
  price: { type: Number, required: true },
  bed: { type: String, required: true },
  occupancy: { type: Number, required: true },
  status: { type: String, enum: ['available', 'occupied', 'reserved', 'maintenance'], default: 'available' },
  amenities: { type: String }
});

module.exports = mongoose.model('Room', roomSchema);