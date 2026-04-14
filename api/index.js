import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

cloudinary.config({
  cloud_name: 'dbkht813e',
  api_key: '372271962614788',
  api_secret: '093OkuFZMTgpQcRNBrk0WgXvWEA'
});

const JWT_SECRET = process.env.JWT_SECRET || 'office-car-secret-2026';

const storage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'office-car/uploads', allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'] }
});
const upload = multer({ storage });

// =====================
// MONGODB CONNECTION
// =====================
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB error:', err));
}

// =====================
// SCHEMAS
// =====================
const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  licenseType: String,
  licenseExpiry: Date,
  status: { type: String, default: 'available' }
});

const vehicleSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  model: String, type: String, year: Number,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: { type: String, default: 'available' },
  imageUrl: String,
  registrationExpiry: Date, insuranceExpiry: Date,
  lastMaintenanceDate: Date, lastMaintenanceKm: Number,
  currentKm: Number,
  gpsLat: Number, gpsLng: Number, lastGpsUpdate: Date
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  role: { type: String, enum: ['driver', 'team-lead', 'cvp', 'admin'], required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  phone: String
});

const bookingSchema = new mongoose.Schema({
  weekLabel: String, requestor: String, department: String,
  purpose: String, destination: String,
  startTime: Date, endTime: Date, duration: String,
  vehicleRequest: String,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  participants: String,
  status: { type: String, default: 'pending' },
  isAdhoc: { type: Boolean, default: false },
  approvedBy: String, approvedAt: Date,
  startKm: Number, endKm: Number, craneHours: Number,
  startPhoto: String, endPhoto: String,
  checkinLocation: String, checkoutLocation: String,
  pdfUrl: String,
  createdAt: { type: Date, default: Date.now },
  gpsTrack: [{ lat: Number, lng: Number, timestamp: { type: Date, default: Date.now }, speed: Number }]
});

const monthlyLogSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  month: Number, year: Number,
  startKm: Number, endKm: Number, totalKm: Number,
  craneHours: Number, note: String, pdfUrl: String,
  lockedBy: String, lockedAt: Date
});

const trafficViolationSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
  plate: { type: String, required: true },
  violationDate: { type: Date, required: true },
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  location: String,
  status: { type: String, enum: ['unpaid', 'paid', 'disputed'], default: 'unpaid' },
  paidDate: Date, evidenceUrl: String, createdBy: String,
  createdAt: { type: Date, default: Date.now }
});

const Driver = mongoose.model('Driver', driverSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const MonthlyLog = mongoose.model('MonthlyLog', monthlyLogSchema);
const TrafficViolation = mongoose.model('TrafficViolation', trafficViolationSchema);

// =====================
// AUTH MIDDLEWARE
// =====================
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try { req.user = jwt.verify(token, JWT_SECRET); next(); }
  catch (err) { return res.status(401).json({ message: 'Token không hợp lệ' }); }
};

const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Không có quyền' });
  next();
};

// =====================
// AUTH ROUTES
// =====================
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate('driverId');
    if (!user) return res.status(401).json({ message: 'Sai tên đăng nhập' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu' });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role, fullName: user.fullName, driverId: user.driverId?._id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, fullName: user.fullName, role: user.role, driverId: user.driverId } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try { res.json(await User.findById(req.user.id).populate('driverId').select('-password')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// DRIVER ROUTES
// =====================
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find();
    const result = await Promise.all(drivers.map(async d => {
      const vehicles = await Vehicle.find({ driverId: d._id });
      return { ...d.toObject(), vehicles };
    }));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/drivers', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try { res.json(await new Driver(req.body).save()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/drivers/:id', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try { res.json(await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// VEHICLE ROUTES
// =====================
app.get('/api/vehicles', async (req, res) => {
  try { res.json(await Vehicle.find().populate('driverId')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/vehicles', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try { res.json(await new Vehicle(req.body).save()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/vehicles/:id', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try { res.json(await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// BOOKING ROUTES
// =====================
app.get('/api/bookings', async (req, res) => {
  try {
    const filter = {};
    if (req.query.week) filter.weekLabel = req.query.week;
    if (req.query.status) filter.status = req.query.status;
    res.json(await Booking.find(filter).populate('vehicleId').populate('driverId').sort({ startTime: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bookings/my', authMiddleware, async (req, res) => {
  try { res.json(await Booking.find({ driverId: req.user.driverId }).populate('vehicleId').populate('driverId').sort({ startTime: -1 })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    let saved = await new Booking(req.body).save();
    saved = await saved.populate('vehicleId');
    saved = await saved.populate('driverId');
    res.json(saved);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/approve', authMiddleware, roleMiddleware('cvp', 'admin'), async (req, res) => {
  try { res.json(await Booking.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user.fullName, approvedAt: new Date() }, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/assign', authMiddleware, roleMiddleware('team-lead', 'admin'), async (req, res) => {
  try { res.json(await Booking.findByIdAndUpdate(req.params.id, { ...req.body, status: 'assigned' }, { new: true }).populate('vehicleId').populate('driverId')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const { startKm, startPhoto, checkinLocation } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { startKm, startPhoto, checkinLocation, status: 'ongoing' }, { new: true });
    if (booking.vehicleId) await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'in-use' });
    if (booking.driverId) await Driver.findByIdAndUpdate(booking.driverId, { status: 'on-trip' });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkout', authMiddleware, async (req, res) => {
  try {
    const { endKm, craneHours, endPhoto, checkoutLocation } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { endKm, craneHours, endPhoto, checkoutLocation, status: 'completed' }, { new: true });
    if (booking.vehicleId) await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available', currentKm: endKm });
    if (booking.driverId) await Driver.findByIdAndUpdate(booking.driverId, { status: 'available' });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id', authMiddleware, async (req, res) => {
  try { res.json(await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// MONTHLY LOG ROUTES
// =====================
app.get('/api/monthly-logs', async (req, res) => {
  try {
    const filter = {};
    if (req.query.month) filter.month = parseInt(req.query.month);
    if (req.query.year) filter.year = parseInt(req.query.year);
    res.json(await MonthlyLog.find(filter).populate('vehicleId').populate('driverId'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/monthly-logs/generate', authMiddleware, roleMiddleware('admin', 'team-lead', 'cvp'), async (req, res) => {
  try {
    const { month, year } = req.body;
    const vehicles = await Vehicle.find().populate('driverId');
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const bookings = await Booking.find({ status: 'completed', startTime: { $gte: startDate, $lte: endDate } });
    const logs = vehicles.map(v => {
      const vb = bookings.filter(b => b.vehicleId?.toString() === v._id.toString());
      const minKm = vb.length > 0 ? Math.min(...vb.map(b => b.startKm || 0)) : (v.currentKm || 0);
      const maxKm = vb.length > 0 ? Math.max(...vb.map(b => b.endKm || 0)) : (v.currentKm || 0);
      return { vehicleId: v._id, driverId: v.driverId?._id, month, year, startKm: minKm, endKm: maxKm, totalKm: maxKm - minKm, craneHours: vb.reduce((s, b) => s + (b.craneHours || 0), 0), note: '' };
    });
    for (const log of logs) await MonthlyLog.findOneAndUpdate({ vehicleId: log.vehicleId, month: log.month, year: log.year }, log, { upsert: true, new: true });
    res.json(await MonthlyLog.find({ month, year }).populate('vehicleId').populate('driverId'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// GPS TRACKING
// =====================
app.put('/api/vehicles/:id/gps', authMiddleware, async (req, res) => {
  try {
    const { lat, lng, speed, bookingId } = req.body;
    await Vehicle.findByIdAndUpdate(req.params.id, { gpsLat: lat, gpsLng: lng, lastGpsUpdate: new Date() });
    if (bookingId) await Booking.findByIdAndUpdate(bookingId, { $push: { gpsTrack: { lat, lng, timestamp: new Date(), speed: speed || 0 } } });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bookings/:id/track', authMiddleware, async (req, res) => {
  try { res.json(await Booking.findById(req.params.id).select('gpsTrack vehicleId destination startTime')); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// TRAFFIC VIOLATIONS
// =====================
app.get('/api/violations', async (req, res) => {
  try {
    const filter = {};
    if (req.query.vehicleId) filter.vehicleId = req.query.vehicleId;
    if (req.query.status) filter.status = req.query.status;
    res.json(await TrafficViolation.find(filter).populate('vehicleId').sort({ violationDate: -1 }));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/violations', authMiddleware, roleMiddleware('admin', 'team-lead', 'cvp'), async (req, res) => {
  try { res.json(await new TrafficViolation({ ...req.body, createdBy: req.user.fullName }).save()); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/violations/:id', authMiddleware, roleMiddleware('admin', 'team-lead', 'cvp'), async (req, res) => {
  try { res.json(await TrafficViolation.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

app.delete('/api/violations/:id', authMiddleware, roleMiddleware('admin'), async (req, res) => {
  try { await TrafficViolation.findByIdAndDelete(req.params.id); res.json({ ok: true }); }
  catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// MAINTENANCE STATUS
// =====================
app.get('/api/vehicles/maintenance-status', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('driverId');
    const now = new Date();
    const result = vehicles.map(v => {
      const regStatus = !v.registrationExpiry ? 'unknown' : v.registrationExpiry < now ? 'expired' : v.registrationExpiry < new Date(now.getTime() + 30*86400000) ? 'expiring30' : v.registrationExpiry < new Date(now.getTime() + 60*86400000) ? 'expiring60' : 'ok';
      const insStatus = !v.insuranceExpiry ? 'unknown' : v.insuranceExpiry < now ? 'expired' : v.insuranceExpiry < new Date(now.getTime() + 30*86400000) ? 'expiring30' : v.insuranceExpiry < new Date(now.getTime() + 60*86400000) ? 'expiring60' : 'ok';
      const kmSinceMaintenance = v.lastMaintenanceKm ? (v.currentKm || 0) - v.lastMaintenanceKm : null;
      return { ...v.toObject(), registrationStatus: regStatus, insuranceStatus: insStatus, kmSinceMaintenance, maintenanceDue: kmSinceMaintenance !== null && kmSinceMaintenance >= 5000, nextMaintenanceKm: v.lastMaintenanceKm ? v.lastMaintenanceKm + 5000 : null };
    });
    result.sort((a, b) => ({ expired: 0, expiring30: 1, expiring60: 2, unknown: 3, ok: 4 }[a.registrationStatus] || 4) - ({ expired: 0, expiring30: 1, expiring60: 2, unknown: 3, ok: 4 }[b.registrationStatus] || 4));
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// DASHBOARD ROUTES
// =====================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const [totalVehicles, inUse, maintenance, pendingBookings, unpaidViolations] = await Promise.all([
      Vehicle.countDocuments(), Vehicle.countDocuments({ status: 'in-use' }), Vehicle.countDocuments({ status: 'maintenance' }),
      Booking.countDocuments({ status: 'pending' }), TrafficViolation.countDocuments({ status: 'unpaid' })
    ]);
    res.json({ totalVehicles, inUse, maintenance, pendingBookings, unpaidViolations });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/today', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
    res.json(await Booking.find({ startTime: { $gte: today, $lt: tomorrow } }).populate('vehicleId').populate('driverId'));
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/alerts', async (req, res) => {
  try {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30*86400000);
    const in60 = new Date(now.getTime() + 60*86400000);
    const all = await Vehicle.find({ $or: [{ registrationExpiry: { $lte: in60, $exists: true, $ne: null } }, { insuranceExpiry: { $lte: in60, $exists: true, $ne: null } }] });
    const expired = all.filter(v => (v.registrationExpiry && v.registrationExpiry < now) || (v.insuranceExpiry && v.insuranceExpiry < now));
    const expiring30 = all.filter(v => !expired.includes(v) && ((v.registrationExpiry && v.registrationExpiry < in30) || (v.insuranceExpiry && v.insuranceExpiry < in30)));
    const expiring60 = all.filter(v => !expired.includes(v) && !expiring30.includes(v));
    const maintenanceDue = (await Vehicle.find()).filter(v => v.lastMaintenanceKm && v.currentKm && (v.currentKm - v.lastMaintenanceKm) >= 5000);
    res.json({ expired, expiring30, expiring60, maintenanceDue });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/violations-summary', async (req, res) => {
  try {
    const unpaid = await TrafficViolation.find({ status: 'unpaid' });
    res.json({ unpaidCount: unpaid.length, unpaidTotal: unpaid.reduce((s, v) => s + (v.amount || 0), 0), totalCount: await TrafficViolation.countDocuments() });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// FILE UPLOAD
// =====================
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  res.json({ url: req.file.path });
});

// =====================
// SEED DATA
// =====================
app.post('/api/seed', async (req, res) => {
  try {
    await Promise.all([Driver.deleteMany({}), Vehicle.deleteMany({}), User.deleteMany({}), Booking.deleteMany({}), MonthlyLog.deleteMany({}), TrafficViolation.deleteMany({})]);
    const driversData = [
      { name: 'Trần Văn Liêu', phone: '0963377588', licenseType: 'D' },
      { name: 'Nguyễn Đình Lam', phone: '0967416968', licenseType: 'C' },
      { name: 'Phạm Hồng Thái', phone: '0912999222', licenseType: 'C' },
      { name: 'Lê Quý Lợi', phone: '0982595514', licenseType: 'C' },
      { name: 'Nguyễn Ngọc Thắng', phone: '0963455456', licenseType: 'B2' },
      { name: 'Nguyễn Tiến Thắng', phone: '0913469669', licenseType: 'E' },
      { name: 'Phạm Quang Tuấn', phone: '0985500776', licenseType: 'E' },
      { name: 'Trần Thanh Hà', phone: '0963337555', licenseType: '' },
      { name: 'Nguyễn Thanh Thuận', phone: '0916636222', licenseType: 'B2' }
    ];
    const drivers = await Driver.insertMany(driversData);
    const now = new Date();
    const dfn = (d) => new Date(now.getTime() + d * 86400000);
    const da = (d) => new Date(now.getTime() - d * 86400000);
    const vehiclesData = [
      { plate: '38B-011.44', model: 'Nissan', type: 'Xe khách 16 chỗ', year: 2016, driverId: drivers[0]._id, currentKm: 152644, imageUrl: '/images/cars/z7285194480815_b3ea4c242c2adfde97345edbab39249d.jpg', registrationExpiry: dfn(120), insuranceExpiry: dfn(200), lastMaintenanceDate: da(60), lastMaintenanceKm: 149000, gpsLat: 18.342, gpsLng: 105.905, lastGpsUpdate: da(0) },
      { plate: '38A-131.40', model: 'Toyota Camry 2.4', type: 'Xe con', year: 2003, driverId: drivers[0]._id, currentKm: 506216, imageUrl: '/images/cars/z7288635310169_7251cc1d2955ec9cd017b75daffc94fa.jpg', registrationExpiry: dfn(-10), insuranceExpiry: dfn(90), lastMaintenanceDate: da(120), lastMaintenanceKm: 500000, gpsLat: 18.338, gpsLng: 105.912, lastGpsUpdate: da(1) },
      { plate: '38C-153.27', model: 'Mipec INTERNATIONAL', type: 'Xe nâng Hotline', year: 2020, driverId: drivers[1]._id, currentKm: 29522, imageUrl: '/images/cars/z7285195044378_758f6424e67c8d9f7c9d76a00e2a61c1.jpg', registrationExpiry: dfn(45), insuranceExpiry: dfn(180), lastMaintenanceDate: da(30), lastMaintenanceKm: 27000, gpsLat: 18.355, gpsLng: 105.89, lastGpsUpdate: da(0) },
      { plate: '38C-130.04', model: 'Triton', type: 'Xe bán tải', year: 2011, driverId: drivers[1]._id, currentKm: 326546, imageUrl: '/images/cars/z7285195296847_1e8640f0439080085b49e28f9b4e7df7.jpg', registrationExpiry: dfn(20), insuranceExpiry: dfn(15), lastMaintenanceDate: da(90), lastMaintenanceKm: 321000, gpsLat: 18.33, gpsLng: 105.92, lastGpsUpdate: da(0) },
      { plate: '38C-078.26', model: 'Hino', type: 'Xe tải cẩu 5 tấn gắn gàu', year: 2015, driverId: drivers[1]._id, currentKm: 41820, imageUrl: '/images/cars/z7285194665856_3a3767182f5c334f2ea656e065028752.jpg', registrationExpiry: dfn(200), insuranceExpiry: dfn(200), lastMaintenanceDate: da(45), lastMaintenanceKm: 38000, gpsLat: 18.348, gpsLng: 105.88, lastGpsUpdate: da(2) },
      { plate: '38N-0587', model: 'Toyota', type: 'Xe con', year: 2008, driverId: drivers[2]._id, currentKm: 409026, imageUrl: '/images/cars/z7285194752282_3f7ec2f16dbf6e57b96cbceb9f7f6db7.jpg', registrationExpiry: dfn(60), insuranceExpiry: dfn(-5), lastMaintenanceDate: da(150), lastMaintenanceKm: 403000, gpsLat: 18.335, gpsLng: 105.915, lastGpsUpdate: da(0) },
      { plate: '38C-218.07', model: 'Mitsubishi Triton', type: 'Xe bán tải', year: 2023, driverId: drivers[2]._id, currentKm: 10494, imageUrl: '/images/cars/z7285194822308_78075c44554f8bf5c62276f966c6c8fc.jpg', registrationExpiry: dfn(300), insuranceExpiry: dfn(300), lastMaintenanceDate: da(20), lastMaintenanceKm: 9500, gpsLat: 18.34, gpsLng: 105.9, lastGpsUpdate: da(0) },
      { plate: '38A-131.55', model: 'Toyota LANDCRUISER', type: 'Xe con', year: 2004, driverId: drivers[3]._id, currentKm: 706217, imageUrl: '/images/cars/z7285194822332_ce2b5df47d197a612df883ad06b75560.jpg', registrationExpiry: dfn(90), insuranceExpiry: dfn(90), lastMaintenanceDate: da(30), lastMaintenanceKm: 704000, gpsLat: 18.36, gpsLng: 105.93, lastGpsUpdate: da(0) },
      { plate: '38A-050.89', model: 'Toyota PRADO', type: 'Xe con', year: 2014, driverId: drivers[3]._id, currentKm: 458044, imageUrl: '/images/cars/z7285194866035_e44201ae2d610ce665a5a2104dc421be.jpg', registrationExpiry: dfn(150), insuranceExpiry: dfn(150), lastMaintenanceDate: da(60), lastMaintenanceKm: 455000, gpsLat: 18.325, gpsLng: 105.94, lastGpsUpdate: da(3) },
      { plate: '38A-066.72', model: 'Toyota Fortuner', type: 'Xe con', year: 2013, driverId: drivers[4]._id, currentKm: 234553, imageUrl: '/images/cars/z7285194866170_7dc0898402e78766386c2a826d367e82.jpg', registrationExpiry: dfn(-20), insuranceExpiry: dfn(50), lastMaintenanceDate: da(100), lastMaintenanceKm: 228000, gpsLat: 18.35, gpsLng: 105.91, lastGpsUpdate: da(0) },
      { plate: '38A-163.87', model: 'Toyota Camry 2.4', type: 'Xe con', year: 2010, driverId: drivers[5]._id, currentKm: 349633, imageUrl: '/images/cars/z7285195509372_8cec06ee59dbc7b85df61e421ace7339.jpg', registrationExpiry: dfn(180), insuranceExpiry: dfn(180), lastMaintenanceDate: da(40), lastMaintenanceKm: 347000, gpsLat: 18.345, gpsLng: 105.908, lastGpsUpdate: da(0) },
      { plate: '38C-095.53', model: 'Nissan', type: 'Xe thang', year: 2016, driverId: drivers[5]._id, currentKm: 6029, registrationExpiry: dfn(25), insuranceExpiry: dfn(100), lastMaintenanceDate: da(15), lastMaintenanceKm: 5500 },
      { plate: '38C-018.86', model: 'Ford Transit', type: 'Xe khách 16 chỗ', year: 2024, driverId: drivers[5]._id, currentKm: 9022, imageUrl: '/images/cars/z7288634505072_0f2c207d691cec52178597d44c857f4a.jpg', registrationExpiry: dfn(350), insuranceExpiry: dfn(350), lastMaintenanceDate: da(10), lastMaintenanceKm: 8000, gpsLat: 18.338, gpsLng: 105.895, lastGpsUpdate: da(0) },
      { plate: '38N-4732', model: 'Toyota HIACE', type: 'Xe khách 16 chỗ', year: 2010, driverId: drivers[6]._id, currentKm: 334796, imageUrl: '/images/cars/z7288634703030_38ea95848b33946b46390ff03ad9c55f.jpg', registrationExpiry: dfn(80), insuranceExpiry: dfn(80), lastMaintenanceDate: da(70), lastMaintenanceKm: 330000, gpsLat: 18.332, gpsLng: 105.925, lastGpsUpdate: da(0) },
      { plate: '38A-562.21', model: 'Mitsubishi', type: 'Xe con', year: 2023, driverId: drivers[6]._id, currentKm: 34465, registrationExpiry: dfn(250), insuranceExpiry: dfn(250), lastMaintenanceDate: da(25), lastMaintenanceKm: 32000, gpsLat: 18.355, gpsLng: 105.935, lastGpsUpdate: da(0) },
      { plate: '38C-057.01', model: 'HiNo', type: 'Xe tải cẩu 5 tấn', year: 2014, driverId: drivers[6]._id, currentKm: 75912, imageUrl: '/images/cars/z7288634978755_712e06977007a3ececfaa2dd186cacdc.jpg', registrationExpiry: dfn(100), insuranceExpiry: dfn(100), lastMaintenanceDate: da(55), lastMaintenanceKm: 72000, gpsLat: 18.32, gpsLng: 105.885, lastGpsUpdate: da(1) },
      { plate: '38A-131.47', model: 'Toyota LANDCRUISER', type: 'Xe con', year: 2000, driverId: drivers[7]._id, currentKm: 661177, imageUrl: '/images/cars/z7288635360657_ed43d07dd6a9b2fc93f37c1f2ff0da9f.jpg', registrationExpiry: dfn(10), insuranceExpiry: dfn(40), lastMaintenanceDate: da(80), lastMaintenanceKm: 655000, gpsLat: 18.365, gpsLng: 105.9, lastGpsUpdate: da(0) },
      { plate: '38C-088.54', model: 'Toyota HILUX', type: 'Xe bán tải', year: 2016, driverId: drivers[8]._id, currentKm: 41925, registrationExpiry: dfn(55), insuranceExpiry: dfn(55), lastMaintenanceDate: da(35), lastMaintenanceKm: 39000, gpsLat: 18.31, gpsLng: 105.91, lastGpsUpdate: da(0) },
      { plate: '38C-128.60', model: 'Xe tải', type: 'Xe tải', year: 2018, driverId: null, currentKm: 243995, registrationExpiry: dfn(70), insuranceExpiry: dfn(70), lastMaintenanceDate: da(90), lastMaintenanceKm: 238000 },
      { plate: '38C-081.53', model: 'Xe tải', type: 'Xe tải', year: 2017, driverId: null, currentKm: 161087, registrationExpiry: dfn(45), insuranceExpiry: dfn(30), lastMaintenanceDate: da(110), lastMaintenanceKm: 155000 }
    ];
    const vehicles = await Vehicle.insertMany(vehiclesData);
    await TrafficViolation.insertMany([
      { vehicleId: vehicles[1]._id, plate: '38A-131.40', violationDate: da(15), description: 'Vượt đèn đỏ tại ngã tư Nguyễn Du - Trần Phú', amount: 4000000, location: 'TP Hà Tĩnh', status: 'unpaid', createdBy: 'Admin' },
      { vehicleId: vehicles[5]._id, plate: '38N-0587', violationDate: da(30), description: 'Đi quá tốc độ cho phép 20km/h', amount: 3000000, location: 'QL1A, Cẩm Xuyên', status: 'unpaid', createdBy: 'Admin' },
      { vehicleId: vehicles[9]._id, plate: '38A-066.72', violationDate: da(45), description: 'Đỗ xe sai quy định tại khu vực cấm', amount: 1500000, location: 'TP Hà Tĩnh', status: 'paid', paidDate: da(40), createdBy: 'Admin' },
      { vehicleId: vehicles[3]._id, plate: '38C-130.04', violationDate: da(5), description: 'Không có giấy phép lưu hành', amount: 5000000, location: 'Kỳ Anh', status: 'unpaid', createdBy: 'Admin' },
      { vehicleId: vehicles[7]._id, plate: '38A-131.55', violationDate: da(60), description: 'Lỗi hỏng đèn hậu', amount: 800000, location: 'Hương Sơn', status: 'paid', paidDate: da(55), createdBy: 'Admin' },
    ]);
    const hp = await bcrypt.hash('123456', 10);
    await User.insertMany([
      { username: 'admin', password: hp, fullName: 'Quản lý Hệ thống', role: 'admin' },
      { username: 'totruong', password: hp, fullName: 'Tổ trưởng Đội xe', role: 'team-lead' },
      { username: 'cvp', password: hp, fullName: 'Chánh Văn phòng', role: 'cvp' },
      ...drivers.map(d => ({ username: d.phone, password: hp, fullName: d.name, role: 'driver', driverId: d._id, phone: d.phone }))
    ]);
    await Booking.insertMany([
      { weekLabel: 'Tuần 15', requestor: 'Phòng KHVT', department: 'P4', purpose: 'Kiểm tra tiến độ dự án', destination: 'Khu vực Cẩm Xuyên', startTime: new Date('2026-04-10T07:00:00'), endTime: new Date('2026-04-10T17:00:00'), duration: '1 Ngày', vehicleRequest: '4 chỗ', status: 'pending' },
      { weekLabel: 'Tuần 15', requestor: 'Đội sửa chữa Hotline', department: 'Hotline', purpose: 'Xử lý khiếm khuyết trên ĐZ 477E18.3', destination: 'Khu vực Kỳ Anh', startTime: new Date('2026-04-11T06:00:00'), endTime: new Date('2026-04-12T17:00:00'), duration: '2 Ngày', vehicleId: vehicles[2]._id, driverId: drivers[1]._id, status: 'assigned' },
      { weekLabel: 'Tuần 15', requestor: 'Văn phòng Công ty', department: 'VP', purpose: 'Đưa đón cán bộ đi công tác', destination: 'Thành phố Hà Tĩnh', startTime: new Date(), endTime: new Date(Date.now() + 4*3600000), duration: '4 Giờ', vehicleId: vehicles[5]._id, driverId: drivers[5]._id, status: 'ongoing', startKm: 349633, isAdhoc: true },
    ]);
    res.json({ message: 'Seed hoàn tất!', drivers: drivers.length, vehicles: vehicles.length });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// START (only for local dev, not on Vercel)
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;
