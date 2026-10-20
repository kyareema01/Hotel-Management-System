const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Room = require('./models/Room');
const Guest = require('./models/Guest');
const Booking = require('./models/Booking');
const Invoice = require('./models/Invoice');
const Activity = require('./models/Activity');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Serve frontend files

// Connect to MongoDB
// Connect to MongoDB
mongoose.connect('mongodb://kyareema01:2213@kalidb-shard-00-00.pdtku.mongodb.net:27017,kalidb-shard-00-01.pdtku.mongodb.net:27017,kalidb-shard-00-02.pdtku.mongodb.net:27017/?ssl=true&replicaSet=atlas-12dp3j-shard-0&authSource=admin')
.then(async () => {
  console.log('Connected to MongoDB: usman_danfodio_hotel');
  await seedDatabaseIfNeeded();
}).catch(err => console.error('MongoDB connection error:', err));

// Database Seeding function for initial setup
async function seedDatabaseIfNeeded() {
  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    console.log('Seeding initial rooms and guests into MongoDB...');
    const types = ['Standard Single', 'Standard Double', 'Deluxe Room', 'Suite', 'Presidential Suite'];
    const prices = [15000, 25000, 40000, 75000, 150000];
    const beds = ['Single', 'Double', 'Queen', 'King', 'King'];
    
    for (let floor = 1; floor <= 5; floor++) {
      for (let room = 1; room <= 5; room++) {
        const ti = Math.floor(Math.random() * types.length);
        await Room.create({
          number: String(floor * 100 + room),
          floor: `${floor}${floor === 1 ? 'st' : floor === 2 ? 'nd' : floor === 3 ? 'rd' : 'th'} Floor`,
          type: types[ti],
          price: prices[ti],
          bed: beds[ti],
          occupancy: ti < 2 ? 2 : ti < 3 ? 3 : 4,
          status: 'available',
          amenities: 'AC, WiFi, TV' + (ti >= 2 ? ', Minibar' : '') + (ti >= 3 ? ', Jacuzzi' : '')
        });
      }
    }

    await Guest.create([
      { fname: 'Amina', lname: 'Bello', phone: '+234 802 345 6789', email: 'amina.bello@gmail.com', idtype: 'NIN', idnum: '12345678901', nationality: 'Nigerian', dob: new Date('1990-05-15'), address: '14 Wuse Zone 5, Abuja' },
      { fname: 'Chukwudi', lname: 'Okafor', phone: '+234 805 678 9012', email: 'chukwudi.o@yahoo.com', idtype: 'International Passport', idnum: 'A12345678', nationality: 'Nigerian', dob: new Date('1985-11-20'), address: '22 Victoria Island, Lagos' },
      { fname: 'Fatima', lname: 'Musa', phone: '+234 811 234 5678', email: 'fatima.musa@hotmail.com', idtype: "Driver's License", idnum: 'DL9876543', nationality: 'Nigerian', dob: new Date('1995-03-08'), address: '7 Maitama District, Abuja' }
    ]);
    console.log('Seeding completed successfully.');
  }
}

// ============ API ROUTES ============

// Get all system state data
app.get('/api/state', async (req, res) => {
  try {
    const rooms = await Room.find();
    const guests = await Guest.find();
    const bookings = await Booking.find();
    const invoices = await Invoice.find();
    const activities = await Activity.find().sort({ _id: -1 }).limit(8);
    res.json({ rooms, guests, bookings, invoices, activities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Room Routes
app.post('/api/rooms', async (req, res) => {
  try {
    const room = await Room.create(req.body);
    await Activity.create({ text: `Room ${room.number} added to inventory`, type: 'green', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
  try {
    const room = await Room.findByIdAndUpdate(req.params.id, req.body, { new: true });
    await Activity.create({ text: `Room ${room.number} marked as ${room.status}`, type: room.status === 'available' ? 'green' : 'red', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(room);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    await Room.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Guest Routes
app.post('/api/guests', async (req, res) => {
  try {
    const guest = await Guest.create(req.body);
    await Activity.create({ text: `New guest registered: ${guest.fname} ${guest.lname}`, type: 'blue', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(guest);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/guests/:id', async (req, res) => {
  try {
    await Guest.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Booking Routes
app.post('/api/bookings', async (req, res) => {
  try {
    const { guestId, roomId, checkin, checkout, adults, children, notes } = req.body;
    const room = await Room.findById(roomId);
    const guest = await Guest.findById(guestId);
    if (!room || !guest) return res.status(404).json({ error: 'Room or Guest not found' });

    const nights = Math.round((new Date(checkout) - new Date(checkin)) / (1000 * 60 * 60 * 24));
    const amount = nights * room.price;

    const booking = await Booking.create({
      guestId,
      guestName: `${guest.fname} ${guest.lname}`,
      roomId,
      roomNumber: room.number,
      roomType: room.type,
      roomPrice: room.price,
      checkin,
      checkout,
      nights,
      amount,
      adults,
      children,
      notes,
      status: 'reserved'
    });

    room.status = 'reserved';
    await room.save();
    guest.stays += 1;
    await guest.save();

    await Activity.create({ text: `Booking created for ${guest.fname} ${guest.lname}`, type: 'gold', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/bookings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);
    const room = await Room.findById(booking.roomId);

    booking.status = status;
    if (status === 'checkedin') room.status = 'occupied';
    if (status === 'checkedout') room.status = 'available';
    if (status === 'cancelled') room.status = 'available';

    await booking.save();
    await room.save();

    await Activity.create({ text: `Booking ${status}: ${booking.guestName} → Room ${room.number}`, type: status === 'checkedin' ? 'green' : 'red', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(booking);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (booking) {
      const room = await Room.findById(booking.roomId);
      if (room && room.status !== 'maintenance') {
        room.status = 'available';
        await room.save();
      }
      await Booking.findByIdAndDelete(req.params.id);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Invoice Routes
app.post('/api/invoices', async (req, res) => {
  try {
    const { bookingId, service, restaurant, laundry, other } = req.body;
    const booking = await Booking.findById(bookingId);
    const services = Number(service) + Number(restaurant) + Number(laundry) + Number(other);
    const total = booking.amount + services;

    const invoiceCount = await Invoice.countDocuments();
    const invoiceId = 'INV' + String(invoiceCount + 1).padStart(4, '0');

    const invoice = await Invoice.create({
      id: invoiceId,
      bookingId,
      guestName: booking.guestName,
      roomNumber: booking.roomNumber,
      nights: booking.nights,
      roomCharges: booking.amount,
      services,
      total,
      status: 'pending',
      date: new Date().toISOString().split('T')[0]
    });

    await Activity.create({ text: `Invoice created for ${booking.guestName} — ₦${total.toLocaleString()}`, type: 'gold', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/invoices/:id/pay', async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndUpdate(req.params.id, { status: 'paid' }, { new: true });
    await Activity.create({ text: `Payment received for Invoice`, type: 'green', time: new Date().toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }) });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));