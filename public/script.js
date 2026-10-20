// ============ STATE ============
let state = {
  rooms: [],
  guests: [],
  bookings: [],
  invoices: [],
  activities: []
};

// ============ INIT ============
async function init() {
  document.getElementById('date-display').textContent = new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  await fetchState();
  renderAll();
}

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    const data = await res.json();
    state.rooms = data.rooms;
    state.guests = data.guests;
    state.bookings = data.bookings;
    state.invoices = data.invoices;
    state.activities = data.activities;
  } catch (err) {
    console.error('Error fetching state from MongoDB backend:', err);
    toast('Failed to connect to database', 'error');
  }
}

function navigate(page, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  el.classList.add('active');
  const titles = { 
    dashboard: 'Dashboard', 
    rooms: 'Room Management', 
    bookings: 'Reservations & Bookings', 
    guests: 'Guest Registry', 
    checkinout: 'Check-In / Check-Out', 
    billing: 'Billing & Invoices', 
    reports: 'Reports & Analytics' 
  };
  document.getElementById('page-title').textContent = titles[page] || page;
  if (page === 'bookings') renderBookings();
  if (page === 'rooms') renderRooms();
  if (page === 'guests') renderGuests();
  if (page === 'checkinout') renderCheckInOut();
  if (page === 'billing') renderBilling();
  if (page === 'reports') renderReports();
  if (page === 'dashboard') renderDashboard();
}

async function renderAll() { 
  await fetchState();
  renderDashboard(); 
  renderRooms(); 
  renderBookings(); 
  renderGuests(); 
  renderCheckInOut(); 
  renderBilling(); 
  updateBadge(); 
}

function renderDashboard() {
  const available = state.rooms.filter(r => r.status === 'available').length;
  const occupied = state.rooms.filter(r => r.status === 'occupied').length;
  const total = state.rooms.length;
  document.getElementById('stat-available').textContent = available;
  document.getElementById('stat-occupied').textContent = occupied;
  document.getElementById('stat-total').textContent = total;
  const revenue = state.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  document.getElementById('stat-revenue').textContent = '₦' + revenue.toLocaleString();
  const occRate = total ? Math.round((occupied / total) * 100) : 0;
  document.getElementById('occ-rate').textContent = occRate + '%';
  document.getElementById('occ-bar').style.width = occRate + '%';
  const tbody = document.getElementById('dash-bookings-tbody');
  if (!state.bookings.length) { tbody.innerHTML = '<tr><td colspan="5">No bookings yet</td></tr>'; return; }
  tbody.innerHTML = state.bookings.slice(-5).reverse().map(b => `
    <tr>
      <td>${b.guestName}</td><td>Room ${b.roomNumber}</td>
      <td>${b.checkin}</td><td>${b.checkout}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
    </tr>`).join('');

  const feed = document.getElementById('activity-feed');
  if (feed) {
    feed.innerHTML = state.activities.map(a => `
      <div class="activity-item">
        <div class="activity-dot ${a.type}"></div>
        <div class="activity-text">${a.text}<span>${a.time}</span></div>
      </div>`).join('');
  }
}

function renderRooms(filter = 'all') {
  const grid = document.getElementById('rooms-grid');
  const rooms = filter === 'all' ? state.rooms : state.rooms.filter(r => r.status === filter);
  if (!rooms.length) { grid.innerHTML = '<div>No rooms found.</div>'; return; }
  grid.innerHTML = rooms.map(r => `
    <div class="room-card ${r.status}" onclick="showRoomDetail('${r._id}')">
      <div class="room-number">${r.number}</div>
      <div class="room-type">${r.type}</div>
      <span class="badge badge-${r.status}">${r.status}</span>
      <div class="room-price">₦${r.price.toLocaleString()}/night</div>
      <div class="room-floor">${r.floor} · ${r.bed} bed</div>
    </div>`).join('');
}

function filterRooms(f, el) {
  document.querySelectorAll('.room-filter').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  renderRooms(f);
}

function showRoomDetail(id) {
  const r = state.rooms.find(x => x._id === id);
  if (!r) return;
  document.getElementById('rd-title').textContent = `Room ${r.number} — ${r.type}`;
  document.getElementById('rd-content').innerHTML = `
    <div>Status: ${r.status} | Floor: ${r.floor} | Price: ₦${r.price.toLocaleString()}/night | Bed: ${r.bed} | Occupancy: ${r.occupancy}</div>
    <div>Amenities: ${r.amenities}</div>
    <select id="rd-status">
      <option value="available" ${r.status === 'available' ? 'selected' : ''}>Available</option>
      <option value="occupied"  ${r.status === 'occupied' ? 'selected' : ''}>Occupied</option>
      <option value="reserved"  ${r.status === 'reserved' ? 'selected' : ''}>Reserved</option>
      <option value="maintenance" ${r.status === 'maintenance' ? 'selected' : ''}>Maintenance</option>
    </select>`;
  document.getElementById('rd-actions').innerHTML = `
    <button class="btn btn-outline" onclick="closeModal('room-detail-modal')">Close</button>
    <button class="btn btn-gold" onclick="updateRoomStatus('${r._id}')">Save Changes</button>
    <button class="btn btn-outline" style="border-color:var(--red);color:var(--red)" onclick="deleteRoom('${r._id}')">Delete</button>`;
  openModal('room-detail-modal');
}

async function updateRoomStatus(id) {
  const ns = document.getElementById('rd-status').value;
  const res = await fetch(`/api/rooms/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: ns })
  });
  if (res.ok) {
    closeModal('room-detail-modal');
    await renderAll();
    toast(`Room status updated to ${ns}`, 'success');
  }
}

async function deleteRoom(id) {
  if (!confirm('Delete this room?')) return;
  const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
  if (res.ok) {
    closeModal('room-detail-modal');
    await renderAll();
    toast('Room deleted', 'info');
  }
}

function renderBookings(filter = '') {
  const tbody = document.getElementById('bookings-tbody');
  let bks = state.bookings;
  if (filter) bks = bks.filter(b => b.guestName.toLowerCase().includes(filter) || b.roomNumber.includes(filter));
  if (!bks.length) { tbody.innerHTML = '<tr><td colspan="9">No bookings found.</td></tr>'; return; }
  tbody.innerHTML = bks.map(b => `
    <tr>
      <td>${b._id.slice(-6).toUpperCase()}</td><td>${b.guestName}</td>
      <td>Room ${b.roomNumber} (${b.roomType})</td>
      <td>${b.checkin}</td><td>${b.checkout}</td><td>${b.nights}</td>
      <td>₦${b.amount.toLocaleString()}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td>
        ${b.status === 'reserved' ? `<button class="btn btn-sm btn-gold" onclick="updateBookingStatus('${b._id}', 'checkedin')">Check In</button>` : ''}
        ${b.status === 'checkedin' ? `<button class="btn btn-sm btn-outline" onclick="updateBookingStatus('${b._id}', 'checkedout')">Check Out</button>` : ''}
        <button class="btn btn-sm btn-outline" onclick="cancelBooking('${b._id}')">Cancel</button>
      </td>
    </tr>`).join('');
}

function renderGuests(filter = '') {
  const tbody = document.getElementById('guests-tbody');
  let gs = state.guests;
  if (filter) gs = gs.filter(g => (g.fname + ' ' + g.lname).toLowerCase().includes(filter) || g.phone.includes(filter));
  if (!gs.length) { tbody.innerHTML = '<tr><td colspan="8">No guests found.</td></tr>'; return; }
  tbody.innerHTML = gs.map(g => `
    <tr>
      <td>${g._id.slice(-6).toUpperCase()}</td><td>${g.fname} ${g.lname}</td>
      <td>${g.phone}</td><td>${g.email}</td>
      <td>${g.idtype}</td><td>${g.idnum}</td><td>${g.stays}</td>
      <td><button class="btn btn-sm btn-outline" onclick="deleteGuest('${g._id}')">Remove</button></td>
  </tr>`).join('');
}

function renderCheckInOut() {
  const today = new Date().toISOString().split('T')[0];
  const pendingIn = state.bookings.filter(b => b.status === 'reserved' && b.checkin <= today);
  const pendingOut = state.bookings.filter(b => b.status === 'checkedin' && b.checkout <= today);

  document.getElementById('cin-count').textContent = pendingIn.length;
  document.getElementById('cout-count').textContent = pendingOut.length;

  const cinT = document.getElementById('checkin-tbody');
  cinT.innerHTML = pendingIn.length ? pendingIn.map(b => `<tr><td>${b.guestName}</td><td>Room ${b.roomNumber}</td><td>${b.checkin}</td><td><button class="btn btn-sm btn-gold" onclick="updateBookingStatus('${b._id}', 'checkedin')">Check In</button></td></tr>`).join('') : '<tr><td colspan="4">No pending check-ins</td></tr>';
  const coutT = document.getElementById('checkout-tbody');
  coutT.innerHTML = pendingOut.length ? pendingOut.map(b => `<tr><td>${b.guestName}</td><td>Room ${b.roomNumber}</td><td>${b.checkout}</td><td><button class="btn btn-sm btn-outline" onclick="updateBookingStatus('${b._id}', 'checkedout')">Check Out</button></td></tr>`).join('') : '<tr><td colspan="4">No pending check-outs</td></tr>';
}

function renderBilling(filter = '') {
  const tbody = document.getElementById('billing-tbody');
  let invs = state.invoices;
  if (filter) invs = invs.filter(i => i.guestName.toLowerCase().includes(filter) || i.id.includes(filter));
  if (!invs.length) { tbody.innerHTML = '<tr><td colspan="9">No invoices yet.</td></tr>'; return; }
  tbody.innerHTML = invs.map(inv => `
    <tr>
      <td>${inv.id}</td><td>${inv.guestName}</td><td>Room ${inv.roomNumber}</td>
      <td>${inv.nights}</td><td>₦${inv.roomCharges.toLocaleString()}</td>
      <td>₦${inv.services.toLocaleString()}</td><td>₦${inv.total.toLocaleString()}</td>
      <td><span class="badge badge-${inv.status}">${inv.status}</span></td>
      <td>${inv.status === 'pending' ? `<button class="btn btn-sm btn-gold" onclick="markPaid('${inv._id}')">Mark Paid</button>` : '✓ Paid'}</td>
    </tr>`).join('');
}

function renderReports() {
  document.getElementById('rep-bookings').textContent = state.bookings.length;
  document.getElementById('rep-guests').textContent = state.guests.length;
  const revenue = state.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  document.getElementById('rep-revenue').textContent = '₦' + revenue.toLocaleString();
  const avg = state.bookings.length ? (state.bookings.reduce((s, b) => s + b.nights, 0) / state.bookings.length).toFixed(1) : 0;
  document.getElementById('rep-avg').textContent = avg;

  const typeCount = {};
  state.rooms.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1; });
  document.getElementById('room-type-report').innerHTML = Object.entries(typeCount).map(([type, count]) => {
    const pct = Math.round(count / state.rooms.length * 100);
    return `<div style="margin-bottom:12px"><span>${type}</span>: ${count} rooms (${pct}%)</div>`;
  }).join('');

  const statusCount = { reserved: 0, checkedin: 0, checkedout: 0 };
  state.bookings.forEach(b => { if (statusCount[b.status] !== undefined) statusCount[b.status]++; });
  document.getElementById('booking-status-report').innerHTML = Object.entries(statusCount).map(([s, c]) => `
    <div><span class="badge badge-${s}">${s}</span>: ${c}</div>`).join('');
}

async function addRoom() {
  const num = document.getElementById('rm-number').value.trim();
  if (!num) { toast('Room number required', 'error'); return; }
  const roomData = {
    number: num,
    floor: document.getElementById('rm-floor').value,
    type: document.getElementById('rm-type').value,
    price: Number(document.getElementById('rm-price').value) || 0,
    bed: document.getElementById('rm-bed').value,
    occupancy: Number(document.getElementById('rm-occupancy').value) || 2,
    status: document.getElementById('rm-status').value,
    amenities: document.getElementById('rm-amenities').value || 'AC, WiFi'
  };
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(roomData)
  });
  if (res.ok) {
    closeModal('room-modal');
    await renderAll();
    toast(`Room ${num} added successfully!`, 'success');
  }
}

async function addGuest() {
  const fname = document.getElementById('g-fname').value.trim();
  const lname = document.getElementById('g-lname').value.trim();
  if (!fname || !lname) { toast('Name required', 'error'); return; }
  const guestData = {
    fname, lname,
    phone: document.getElementById('g-phone').value,
    email: document.getElementById('g-email').value,
    idtype: document.getElementById('g-idtype').value,
    idnum: document.getElementById('g-idnum').value,
    nationality: document.getElementById('g-nationality').value,
    dob: document.getElementById('g-dob').value,
    address: document.getElementById('g-address').value
  };
  const res = await fetch('/api/guests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(guestData)
  });
  if (res.ok) {
    closeModal('guest-modal');
    await renderAll();
    toast(`${fname} ${lname} registered!`, 'success');
  }
}

async function addBooking() {
  const guestId = document.getElementById('bk-guest').value;
  const roomId = document.getElementById('bk-room').value;
  const checkin = document.getElementById('bk-checkin').value;
  const checkout = document.getElementById('bk-checkout').value;
  if (!guestId || !roomId || !checkin || !checkout) { toast('Please fill all required fields', 'error'); return; }
  if (checkout <= checkin) { toast('Check-out must be after check-in', 'error'); return; }
  
  const bookingData = {
    guestId, roomId, checkin, checkout,
    adults: Number(document.getElementById('bk-adults').value) || 1,
    children: Number(document.getElementById('bk-children').value) || 0,
    notes: document.getElementById('bk-notes').value
  };

  const res = await fetch('/api/bookings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bookingData)
  });
  if (res.ok) {
    closeModal('booking-modal');
    await renderAll();
    toast('Booking confirmed!', 'success');
  }
}

async function updateBookingStatus(id, status) {
  const res = await fetch(`/api/bookings/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (res.ok) {
    await renderAll();
    toast(`Booking status updated to ${status}`, 'success');
  }
}

async function cancelBooking(id) {
  if (!confirm('Cancel this booking?')) return;
  const res = await fetch(`/api/bookings/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await renderAll();
    toast('Booking cancelled', 'info');
  }
}

async function deleteGuest(id) {
  if (!confirm('Remove this guest?')) return;
  const res = await fetch(`/api/guests/${id}`, { method: 'DELETE' });
  if (res.ok) {
    await renderAll();
    toast('Guest removed', 'info');
  }
}

async function generateInvoice() {
  const bookingId = document.getElementById('inv-booking').value;
  if (!bookingId) { toast('Select a booking', 'error'); return; }
  const invoiceData = {
    bookingId,
    service: Number(document.getElementById('inv-service').value) || 0,
    restaurant: Number(document.getElementById('inv-restaurant').value) || 0,
    laundry: Number(document.getElementById('inv-laundry').value) || 0,
    other: Number(document.getElementById('inv-other').value) || 0
  };
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invoiceData)
  });
  if (res.ok) {
    closeModal('invoice-modal');
    await renderAll();
    toast('Invoice generated!', 'success');
  }
}

async function markPaid(id) {
  const res = await fetch(`/api/invoices/${id}/pay`, { method: 'PUT' });
  if (res.ok) {
    await renderAll();
    toast('Payment recorded!', 'success');
  }
}

function openModal(id) {
  if (id === 'booking-modal') {
    const gs = document.getElementById('bk-guest');
    gs.innerHTML = state.guests.length ? state.guests.map(g => `<option value="${g._id}">${g.fname} ${g.lname}</option>`).join('') : '<option>No guests — register first</option>';
    const rs = document.getElementById('bk-room');
    const avail = state.rooms.filter(r => r.status === 'available');
    rs.innerHTML = avail.length ? avail.map(r => `<option value="${r._id}">Room ${r.number} — ${r.type} (₦${r.price.toLocaleString()}/night)</option>`).join('') : '<option>No available rooms</option>';
    document.getElementById('bk-checkin').value = new Date().toISOString().split('T')[0];
  }
  if (id === 'invoice-modal') {
    const bks = state.bookings.filter(b => b.status === 'checkedin' || b.status === 'checkedout');
    document.getElementById('inv-booking').innerHTML = bks.length ? bks.map(b => `<option value="${b._id}">${b._id.slice(-6).toUpperCase()} — ${b.guestName} (Room ${b.roomNumber})</option>`).join('') : '<option>No eligible bookings</option>';
    if (bks.length) loadInvoiceDetails();
  }
  document.getElementById(id).classList.add('open');
}

function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function loadInvoiceDetails() {
  const bkId = document.getElementById('inv-booking').value;
  const b = state.bookings.find(x => x._id === bkId);
  if (!b) return;
  document.getElementById('inv-room-charges').textContent = '₦' + b.amount.toLocaleString();
  calcInvoice();
}

function calcInvoice() {
  const bkId = document.getElementById('inv-booking').value;
  const b = state.bookings.find(x => x._id === bkId);
  if (!b) return;
  const s = ['inv-service', 'inv-restaurant', 'inv-laundry', 'inv-other'].reduce((sum, id) => sum + (Number(document.getElementById(id).value) || 0), 0);
  document.getElementById('inv-services-total').textContent = '₦' + s.toLocaleString();
  document.getElementById('inv-grand-total').textContent = '₦' + (b.amount + s).toLocaleString();
}

function calcBookingAmount() {
  const ci = document.getElementById('bk-checkin').value;
  const co = document.getElementById('bk-checkout').value;
  const roomId = document.getElementById('bk-room').value;
  const room = state.rooms.find(r => r._id === roomId);
  if (ci && co && room && co > ci) {
    const nights = Math.round((new Date(co) - new Date(ci)) / (1000 * 60 * 60 * 24));
    const amt = nights * room.price;
    document.getElementById('bk-amount-display').style.display = 'block';
    document.getElementById('bk-amount-val').textContent = `₦${amt.toLocaleString()} (${nights} nights)`;
  }
}

function searchBookings(v) { renderBookings(v.toLowerCase()); }
function searchGuests(v) { renderGuests(v.toLowerCase()); }
function searchInvoices(v) { renderBilling(v.toLowerCase()); }

function updateBadge() {
  const badge = document.getElementById('booking-badge');
  if (badge) badge.textContent = state.bookings.filter(b => b.status === 'reserved').length;
}

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

document.querySelectorAll('.modal-overlay').forEach(ov => {
  ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('open'); });
});

init();