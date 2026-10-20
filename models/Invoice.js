const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  guestName: { type: String, required: true },
  roomNumber: { type: String, required: true },
  nights: { type: Number, required: true },
  roomCharges: { type: Number, required: true },
  services: { type: Number, default: 0 },
  total: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  date: { type: String, required: true }
});

module.exports = mongoose.model('Invoice', invoiceSchema);