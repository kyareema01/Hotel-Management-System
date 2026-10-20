const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true },
  guestName: { type: String, required: true },
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  roomNumber: { type: String, required: true },
  roomType: { type: String, required: true },
  roomPrice: { type: Number, required: true },
  checkin: { type: String, required: true },
  checkout: { type: String, required: true },
  nights: { type: Number, required: true },
  amount: { type: Number, required: true },
  adults: { type: Number, default: 1 },
  children: { type: Number, default: 0 },
  notes: { type: String },
  status: { type: String, enum: ['reserved', 'checkedin', 'checkedout', 'cancelled'], default: 'reserved' }
});

module.exports = mongoose.model('Booking', bookingSchema);