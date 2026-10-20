const mongoose = require('mongoose');

const guestSchema = new mongoose.Schema({
  fname: { type: String, required: true },
  lname: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  idtype: { type: String, required: true },
  idnum: { type: String, required: true },
  nationality: { type: String, required: true },
  dob: { type: Date, required: true },
  address: { type: String, required: true },
  stays: { type: Number, default: 0 }
});

module.exports = mongoose.model('Guest', guestSchema);