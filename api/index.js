import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend is alive on Vercel (ESM)!' });
});

cloudinary.config({
  cloud_name: 'dbkht813e',
  api_key: '372271962614788',
  api_secret: '093OkuFZMTgpQcRNBrk0WgXvWEA'
});

const JWT_SECRET = process.env.JWT_SECRET || 'office-car-secret-2026';

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'office-car/uploads',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf']
  }
});
const upload = multer({ storage });

// =====================
// MONGODB CONNECTION
// =====================
if (!process.env.MONGODB_URI) {
  console.error('❌ FATAL: MONGODB_URI is not defined.');
} else {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));
}

// SCHEMAS
const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  licenseType: String,
  status: { type: String, default: 'available' }
});

const vehicleSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  model: String,
  type: String,
  year: Number,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: { type: String, default: 'available' },
  imageUrl: String,
  currentKm: Number
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
  weekLabel: String,
  requestor: String,
  department: String,
  purpose: String,
  destination: String,
  startTime: Date,
  endTime: Date,
  duration: String,
  vehicleRequest: String,
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: { type: String, default: 'pending' },
  startKm: Number,
  endKm: Number,
  craneHours: Number,
  pdfUrl: String,
  createdAt: { type: Date, default: Date.now }
});

const monthlyLogSchema = new mongoose.Schema({
  vehicleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  month: Number,
  year: Number,
  startKm: Number,
  endKm: Number,
  totalKm: Number,
  craneHours: Number,
  note: String,
  pdfUrl: String
});

const Driver = mongoose.model('Driver', driverSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const MonthlyLog = mongoose.model('MonthlyLog', monthlyLogSchema);

// AUTH MIDDLEWARE
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Chưa đăng nhập' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Token không hợp lệ' });
  }
};

const roleMiddleware = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Không có quyền' });
  next();
};

// ROUTES
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).populate('driverId');
    if (!user) return res.status(401).json({ message: 'Sai tên đăng nhập' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Sai mật khẩu' });
    const token = jwt.sign({ id: user._id, role: user.role, fullName: user.fullName, driverId: user.driverId?._id }, JWT_SECRET);
    res.json({ token, user: { id: user._id, username: user.username, fullName: user.fullName, role: user.role, driverId: user.driverId } });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find();
    const driversWithVehicles = await Promise.all(drivers.map(async (d) => {
      const vehicles = await Vehicle.find({ driverId: d._id });
      return { ...d.toObject(), vehicles };
    }));
    res.json(driversWithVehicles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('driverId');
    res.json(vehicles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bookings', async (req, res) => {
  try {
    const filter = {};
    if (req.query.week) filter.weekLabel = req.query.week;
    const bookings = await Booking.find(filter).populate('vehicleId').populate('driverId').sort({ startTime: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const booking = new Booking(req.body);
    const saved = await booking.save();
    res.json(saved);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/approve', authMiddleware, roleMiddleware('cvp', 'admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user.fullName, approvedAt: new Date() }, { new: true });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/assign', authMiddleware, roleMiddleware('team-lead', 'admin'), async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { vehicleId, driverId, status: 'assigned' }, { new: true }).populate('vehicleId').populate('driverId');
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const { startKm } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { startKm, status: 'ongoing' }, { new: true });
    if (booking.vehicleId) await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'in-use' });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkout', authMiddleware, async (req, res) => {
  try {
    const { endKm, craneHours } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id, { endKm, craneHours, status: 'completed' }, { new: true });
    if (booking.vehicleId) await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available', currentKm: endKm });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/monthly-logs', async (req, res) => {
  try {
    const { month, year } = req.query;
    const logs = await MonthlyLog.find({ month, year }).populate('vehicleId').populate('driverId');
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments();
    const inUse = await Vehicle.countDocuments({ status: 'in-use' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    res.json({ totalVehicles, inUse, pendingBookings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/seed', async (req, res) => {
  try {
    await Driver.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await Booking.deleteMany({});
    await MonthlyLog.deleteMany({});

    const driversData = [
      { name: 'Trần Văn Liêu', phone: '0963377588' },
      { name: 'Nguyễn Đình Lam', phone: '0967416968' },
      { name: 'Phạm Hồng Thái', phone: '0912999222' }
    ];
    const drivers = await Driver.insertMany(driversData);

    const vehiclesData = [
      { plate: '38B-011.44', model: 'Nissan', type: 'Xe khách 16 chỗ', driverId: drivers[0]._id, currentKm: 152644 },
      { plate: '38A-131.40', model: 'Toyota Camry', type: 'Xe con', driverId: drivers[0]._id, currentKm: 506216 }
    ];
    await Vehicle.insertMany(vehiclesData);

    const hashed = await bcrypt.hash('123456', 10);
    await User.insertMany([
      { username: 'admin', password: hashed, fullName: 'Quản lý', role: 'admin' },
      { username: 'cvp', password: hashed, fullName: 'Chánh Văn phòng', role: 'cvp' }
    ]);

    res.json({ message: '✅ ESM Seed hoàn tất!' });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// START
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server (ESM) running on port ${PORT}`));
}

export default app;
