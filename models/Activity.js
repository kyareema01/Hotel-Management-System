const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: { type: String, default: 'gold' },
  time: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, expires: '7d' } // Auto-purge logs older than 7 days
});

module.exports = mongoose.model('Activity', activitySchema);