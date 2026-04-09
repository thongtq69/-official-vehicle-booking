const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

cloudinary.config({
  cloud_name: 'dbkht813e',
  api_key: '372271962614788',
  api_secret: '093OkuFZMTgpQcRNBrk0WgXvWEA'
});

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'office-car-secret-2026';

// File upload config using Cloudinary
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
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// =====================
// SCHEMAS
// =====================

// 1. Driver
const driverSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  licenseType: String,       // B2, C, D, E
  licenseExpiry: Date,
  status: { type: String, default: 'available' } // available, on-trip, off-duty
});

// 2. Vehicle
const vehicleSchema = new mongoose.Schema({
  plate: { type: String, required: true, unique: true },
  model: String,
  type: String,
  year: Number,
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  status: { type: String, default: 'available' },
  imageUrl: String,
  registrationExpiry: Date,
  insuranceExpiry: Date,
  lastMaintenanceDate: Date,
  lastMaintenanceKm: Number,
  currentKm: Number
});

// 3. User (Accounts)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  fullName: String,
  role: { type: String, enum: ['driver', 'team-lead', 'cvp', 'admin'], required: true },
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  phone: String
});

// 4. Booking (Lệnh điều xe)
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
  participants: String,
  status: { type: String, default: 'pending' },
  isAdhoc: { type: Boolean, default: false },
  approvedBy: String,
  approvedAt: Date,
  startKm: Number,
  endKm: Number,
  craneHours: Number,
  startPhoto: String,
  endPhoto: String,
  checkinLocation: String,
  checkoutLocation: String,
  pdfUrl: String,
  createdAt: { type: Date, default: Date.now }
});

// 5. MonthlyLog (Biên bản chốt công tơ mét)
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
  pdfUrl: String,
  lockedBy: String,
  lockedAt: Date
});

const Driver = mongoose.model('Driver', driverSchema);
const Vehicle = mongoose.model('Vehicle', vehicleSchema);
const User = mongoose.model('User', userSchema);
const Booking = mongoose.model('Booking', bookingSchema);
const MonthlyLog = mongoose.model('MonthlyLog', monthlyLogSchema);

// =====================
// AUTH MIDDLEWARE
// =====================
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
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Không có quyền truy cập' });
  }
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

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, fullName: user.fullName, driverId: user.driverId?._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, username: user.username, fullName: user.fullName, role: user.role, driverId: user.driverId } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('driverId').select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =====================
// DRIVER ROUTES
// =====================
app.get('/api/drivers', async (req, res) => {
  try {
    const drivers = await Driver.find();
    // Attach vehicles to each driver
    const driversWithVehicles = await Promise.all(drivers.map(async (d) => {
      const vehicles = await Vehicle.find({ driverId: d._id });
      return { ...d.toObject(), vehicles };
    }));
    res.json(driversWithVehicles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/drivers', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try {
    const driver = new Driver(req.body);
    const saved = await driver.save();
    res.json(saved);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/drivers/:id', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(driver);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// VEHICLE ROUTES
// =====================
app.get('/api/vehicles', async (req, res) => {
  try {
    const vehicles = await Vehicle.find().populate('driverId');
    res.json(vehicles);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/vehicles', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try {
    const vehicle = new Vehicle(req.body);
    const saved = await vehicle.save();
    res.json(saved);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/vehicles/:id', authMiddleware, roleMiddleware('admin', 'team-lead'), async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(vehicle);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// BOOKING ROUTES
// =====================
app.get('/api/bookings', async (req, res) => {
  try {
    const filter = {};
    if (req.query.week) filter.weekLabel = req.query.week;
    if (req.query.status) filter.status = req.query.status;
    const bookings = await Booking.find(filter).populate('vehicleId').populate('driverId').sort({ startTime: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/bookings/my', authMiddleware, async (req, res) => {
  try {
    const bookings = await Booking.find({ driverId: req.user.driverId })
      .populate('vehicleId').populate('driverId').sort({ startTime: -1 });
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/bookings', authMiddleware, async (req, res) => {
  try {
    const booking = new Booking(req.body);
    let saved = await booking.save();
    saved = await saved.populate('vehicleId');
    saved = await saved.populate('driverId');
    res.json(saved);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/approve', authMiddleware, roleMiddleware('cvp', 'admin'), async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id,
      { status: 'approved', approvedBy: req.user.fullName, approvedAt: new Date() },
      { new: true }
    );
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/assign', authMiddleware, roleMiddleware('team-lead', 'admin'), async (req, res) => {
  try {
    const { vehicleId, driverId } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id,
      { vehicleId, driverId, status: 'assigned' },
      { new: true }
    ).populate('vehicleId').populate('driverId');
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkin', authMiddleware, async (req, res) => {
  try {
    const { startKm, startPhoto, checkinLocation } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id,
      { startKm, startPhoto, checkinLocation, status: 'ongoing' },
      { new: true }
    );
    // Update vehicle status
    if (booking.vehicleId) await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'in-use' });
    if (booking.driverId) await Driver.findByIdAndUpdate(booking.driverId, { status: 'on-trip' });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id/checkout', authMiddleware, async (req, res) => {
  try {
    const { endKm, craneHours, endPhoto, checkoutLocation } = req.body;
    const booking = await Booking.findByIdAndUpdate(req.params.id,
      { endKm, craneHours, endPhoto, checkoutLocation, status: 'completed' },
      { new: true }
    );
    // Update vehicle
    if (booking.vehicleId) {
      await Vehicle.findByIdAndUpdate(booking.vehicleId, { status: 'available', currentKm: endKm });
    }
    if (booking.driverId) await Driver.findByIdAndUpdate(booking.driverId, { status: 'available' });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.put('/api/bookings/:id', authMiddleware, async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(booking);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// MONTHLY LOG ROUTES
// =====================
app.get('/api/monthly-logs', async (req, res) => {
  try {
    const { month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    const logs = await MonthlyLog.find(filter).populate('vehicleId').populate('driverId');
    res.json(logs);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.post('/api/monthly-logs/generate', authMiddleware, roleMiddleware('admin', 'team-lead', 'cvp'), async (req, res) => {
  try {
    const { month, year } = req.body;
    // Get all vehicles with drivers
    const vehicles = await Vehicle.find().populate('driverId');
    // Get completed bookings for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    const bookings = await Booking.find({
      status: 'completed',
      startTime: { $gte: startDate, $lte: endDate }
    });

    const logs = vehicles.map(v => {
      const vBookings = bookings.filter(b => b.vehicleId?.toString() === v._id.toString());
      const totalKm = vBookings.reduce((sum, b) => sum + ((b.endKm || 0) - (b.startKm || 0)), 0);
      const craneHours = vBookings.reduce((sum, b) => sum + (b.craneHours || 0), 0);
      const minKm = vBookings.length > 0 ? Math.min(...vBookings.map(b => b.startKm || 0)) : (v.currentKm || 0);
      const maxKm = vBookings.length > 0 ? Math.max(...vBookings.map(b => b.endKm || 0)) : (v.currentKm || 0);

      return {
        vehicleId: v._id,
        driverId: v.driverId?._id,
        month, year,
        startKm: minKm,
        endKm: maxKm,
        totalKm: maxKm - minKm,
        craneHours,
        note: ''
      };
    });

    // Upsert
    for (const log of logs) {
      await MonthlyLog.findOneAndUpdate(
        { vehicleId: log.vehicleId, month: log.month, year: log.year },
        log,
        { upsert: true, new: true }
      );
    }
    const result = await MonthlyLog.find({ month, year }).populate('vehicleId').populate('driverId');
    res.json(result);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// =====================
// DASHBOARD ROUTES
// =====================
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalVehicles = await Vehicle.countDocuments();
    const inUse = await Vehicle.countDocuments({ status: 'in-use' });
    const maintenance = await Vehicle.countDocuments({ status: 'maintenance' });
    const pendingBookings = await Booking.countDocuments({ status: 'pending' });
    res.json({ totalVehicles, inUse, maintenance, pendingBookings });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const bookings = await Booking.find({
      startTime: { $gte: today, $lt: tomorrow }
    }).populate('vehicleId').populate('driverId');
    res.json(bookings);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

app.get('/api/dashboard/alerts', async (req, res) => {
  try {
    const in30Days = new Date();
    in30Days.setDate(in30Days.getDate() + 30);
    const alerts = await Vehicle.find({
      $or: [
        { registrationExpiry: { $lte: in30Days, $exists: true, $ne: null } },
        { insuranceExpiry: { $lte: in30Days, $exists: true, $ne: null } }
      ]
    });
    res.json(alerts);
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
    // Clear all
    await Driver.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await Booking.deleteMany({});
    await MonthlyLog.deleteMany({});

    // Create 9 Drivers
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

    // Create 20 Vehicles (matching Excel data exactly)
    const vehiclesData = [
      { plate: '38B-011.44', model: 'Nissan', type: 'Xe khách 16 chỗ', year: 2016, driverId: drivers[0]._id, currentKm: 152644, imageUrl: '/images/cars/z7285194480815_b3ea4c242c2adfde97345edbab39249d.jpg' },
      { plate: '38A-131.40', model: 'Toyota Camry 2.4', type: 'Xe con', year: 2003, driverId: drivers[0]._id, currentKm: 506216, imageUrl: '/images/cars/z7288635310169_7251cc1d2955ec9cd017b75daffc94fa.jpg' },
      { plate: '38C-153.27', model: 'Mipec INTERNATIONAL', type: 'Xe nâng Hotline', year: 2020, driverId: drivers[1]._id, currentKm: 29522, imageUrl: '/images/cars/z7285195044378_758f6424e67c8d9f7c9d76a00e2a61c1.jpg' },
      { plate: '38C-130.04', model: 'Triton', type: 'Xe bán tải', year: 2011, driverId: drivers[1]._id, currentKm: 326546, imageUrl: '/images/cars/z7285195296847_1e8640f0439080085b49e28f9b4e7df7.jpg' },
      { plate: '38C-078.26', model: 'Hino', type: 'Xe tải cẩu 5 tấn gắn gàu', year: 2015, driverId: drivers[1]._id, currentKm: 41820, imageUrl: '/images/cars/z7285194665856_3a3767182f5c334f2ea656e065028752.jpg' },
      { plate: '38N-0587', model: 'Toyota', type: 'Xe con', year: 2008, driverId: drivers[2]._id, currentKm: 409026, imageUrl: '/images/cars/z7285194752282_3f7ec2f16dbf6e57b96cbceb9f7f6db7.jpg' },
      { plate: '38C-218.07', model: 'Mitsubishi Triton', type: 'Xe bán tải', year: 2023, driverId: drivers[2]._id, currentKm: 10494, imageUrl: '/images/cars/z7285194822308_78075c44554f8bf5c62276f966c6c8fc.jpg' },
      { plate: '38A-131.55', model: 'Toyota LANDCRUISER', type: 'Xe con', year: 2004, driverId: drivers[3]._id, currentKm: 706217, imageUrl: '/images/cars/z7285194822332_ce2b5df47d197a612df883ad06b75560.jpg' },
      { plate: '38A-050.89', model: 'Toyota PRADO', type: 'Xe con', year: 2014, driverId: drivers[3]._id, currentKm: 458044, imageUrl: '/images/cars/z7285194866035_e44201ae2d610ce665a5a2104dc421be.jpg' },
      { plate: '38A-066.72', model: 'Toyota Fortuner', type: 'Xe con', year: 2013, driverId: drivers[4]._id, currentKm: 234553, imageUrl: '/images/cars/z7285194866170_7dc0898402e78766386c2a826d367e82.jpg' },
      { plate: '38A-163.87', model: 'Toyota Camry 2.4', type: 'Xe con', year: 2010, driverId: drivers[5]._id, currentKm: 349633, imageUrl: '/images/cars/z7285195509372_8cec06ee59dbc7b85df61e421ace7339.jpg' },
      { plate: '38C-095.53', model: 'Nissan', type: 'Xe thang', year: 2016, driverId: drivers[5]._id, currentKm: 6029 },
      { plate: '38C-018.86', model: 'Ford Transit', type: 'Xe khách 16 chỗ', year: 2024, driverId: drivers[5]._id, currentKm: 9022, imageUrl: '/images/cars/z7288634505072_0f2c207d691cec52178597d44c857f4a.jpg' },
      { plate: '38N-4732', model: 'Toyota HIACE', type: 'Xe khách 16 chỗ', year: 2010, driverId: drivers[6]._id, currentKm: 334796, imageUrl: '/images/cars/z7288634703030_38ea95848b33946b46390ff03ad9c55f.jpg' },
      { plate: '38A-562.21', model: 'Mitsubishi', type: 'Xe con', year: 2023, driverId: drivers[6]._id, currentKm: 34465 },
      { plate: '38C-057.01', model: 'HiNo', type: 'Xe tải cẩu 5 tấn', year: 2014, driverId: drivers[6]._id, currentKm: 75912, imageUrl: '/images/cars/z7288634978755_712e06977007a3ececfaa2dd186cacdc.jpg' },
      { plate: '38A-131.47', model: 'Toyota LANDCRUISER', type: 'Xe con', year: 2000, driverId: drivers[7]._id, currentKm: 661177, imageUrl: '/images/cars/z7288635360657_ed43d07dd6a9b2fc93f37c1f2ff0da9f.jpg' },
      { plate: '38C-088.54', model: 'Toyota HILUX', type: 'Xe bán tải', year: 2016, driverId: drivers[8]._id, currentKm: 41925 },
      // Extra 2 from biên bản (38C-128.60 and 38C-081.53)
      { plate: '38C-128.60', model: 'Xe tải', type: 'Xe tải', year: 2018, driverId: null, currentKm: 243995 },
      { plate: '38C-081.53', model: 'Xe tải', type: 'Xe tải', year: 2017, driverId: null, currentKm: 161087 }
    ];
    const vehicles = await Vehicle.insertMany(vehiclesData);

    // Create User accounts
    const hashedPassword = await bcrypt.hash('123456', 10);
    const usersData = [
      // 3 tài khoản VP
      { username: 'admin', password: hashedPassword, fullName: 'Quản lý Hệ thống', role: 'admin', phone: '' },
      { username: 'totruong', password: hashedPassword, fullName: 'Tổ trưởng Đội xe', role: 'team-lead', phone: '' },
      { username: 'cvp', password: hashedPassword, fullName: 'Chánh Văn phòng', role: 'cvp', phone: '' },
      // 9 tài khoản lái xe (username = SĐT)
      ...drivers.map(d => ({
        username: d.phone,
        password: hashedPassword,
        fullName: d.name,
        role: 'driver',
        driverId: d._id,
        phone: d.phone
      }))
    ];
    await User.insertMany(usersData);

    // Create sample bookings for Demo
    await Booking.insertMany([
      { 
        weekLabel: 'Tuần 15 - 07/04 → 13/04', 
        requestor: 'Phòng KHVT', 
        department: 'P4', 
        purpose: 'Kiểm tra tiến độ dự án trên địa bàn', 
        destination: 'Khu vực Cẩm Xuyên', 
        startTime: new Date('2026-04-10T07:00:00'), 
        endTime: new Date('2026-04-10T17:00:00'), 
        duration: '1 Ngày', 
        vehicleRequest: '4 chỗ', 
        status: 'pending' 
      },
      { 
        weekLabel: 'Tuần 15 - 07/04 → 13/04', 
        requestor: 'Ông Trần Đức Sơn - PGĐ', 
        department: 'BGĐ', 
        purpose: 'Họp thống nhất phương án điều chuyển công trình điện', 
        destination: 'UBND xã Lộc Hà', 
        startTime: new Date('2026-04-09T07:30:00'), 
        endTime: new Date('2026-04-09T12:00:00'), 
        duration: '0.5 Ngày', 
        vehicleRequest: '07 chỗ', 
        vehicleId: vehicles[7]._id, 
        driverId: drivers[3]._id, 
        status: 'approved', 
        approvedBy: 'Quản lý Hệ thống',
        approvedAt: new Date()
      },
      { 
        weekLabel: 'Tuần 15 - 07/04 → 13/04', 
        requestor: 'Đội sửa chữa Hotline', 
        department: 'Hotline', 
        purpose: 'Xử lý khiếm khuyết trên ĐZ 477E18.3', 
        destination: 'Khu vực Kỳ Anh', 
        startTime: new Date('2026-04-11T06:00:00'), 
        endTime: new Date('2026-04-12T17:00:00'), 
        duration: '2 Ngày', 
        vehicleRequest: 'Xe gàu Hotline BKS: 38C-153.27', 
        vehicleId: vehicles[2]._id, 
        driverId: drivers[1]._id, 
        status: 'assigned', 
        isAdhoc: false 
      },
      { 
        weekLabel: 'Tuần 15 - 07/04 → 13/04', 
        requestor: 'Văn phòng Công ty', 
        department: 'VP', 
        purpose: 'Đưa đón cán bộ đi công tác', 
        destination: 'Thành phố Hà Tĩnh', 
        startTime: new Date(), 
        endTime: new Date(Date.now() + 4 * 3600000), 
        duration: '4 Giờ', 
        vehicleId: vehicles[5]._id, 
        driverId: drivers[5]._id, 
        status: 'ongoing',
        startKm: 349633,
        isAdhoc: true 
      },
      { 
        weekLabel: 'Tuần 14 - 31/03 → 06/04', 
        requestor: 'Phòng P11', 
        department: 'P11', 
        purpose: 'Sát hạch ATĐ định kỳ', 
        destination: 'Hương Sơn', 
        startTime: new Date('2026-04-05T08:00:00'), 
        endTime: new Date('2026-04-05T17:00:00'), 
        duration: '1 Ngày', 
        vehicleId: vehicles[10]._id, 
        driverId: drivers[5]._id, 
        status: 'completed',
        startKm: 234553,
        endKm: 234680,
        totalKm: 127
      }
    ]);

    res.json({
      message: '✅ Seed hoàn tất!',
      drivers: drivers.length,
      vehicles: vehicles.length,
      users: usersData.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// =====================
// START SERVER
// =====================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📂 Static files: /images, /uploads`);
});
