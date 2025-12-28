
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import path from 'path';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import User from './models/user.model';
import { handleSocketEvents } from './sockets/handlers';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import aidRequestRoutes from './routes/aidRequest.routes';
import notificationRoutes from './routes/notification.routes';
import { RegistrationStatus } from './types/types';

// --- GUARANTEED LOCAL DEVELOPMENT CONFIG ---
const MONGO_URI = 'mongodb://localhost:27017/ethiosafeguard';
const REDIS_URL = 'redis://localhost:6379';
const PORT = 5000;
const JWT_SECRET = 'secret';
// --- END CONFIG ---

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const pubClient = createClient({ url: REDIS_URL });
const subClient = pubClient.duplicate();

const createAdminAccount = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) return;
    const hashedPassword = await bcrypt.hash('adminpassword', 12);
    const adminUser = new User({
      name: 'Admin',
      email: 'admin@ethiosafeguard.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: RegistrationStatus.APPROVED,
    });
    await adminUser.save();
    console.log('Admin account created successfully.');
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
};

// ** FIX: Set JWT secret *before* registering routes **
app.use((req, res, next) => {
  req.app.set('jwt_secret', JWT_SECRET);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/aid-requests', aidRequestRoutes);
app.use('/api/notifications', notificationRoutes);

handleSocketEvents(io);

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected successfully.');
    await createAdminAccount();
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Connected to Redis and Socket.IO adapter is set up');
      })
      .catch((err) => {
        console.error('Failed to connect to Redis:', err);
      });
  })
  .catch(err => {
    console.error('!!! CRITICAL: MONGODB CONNECTION FAILED !!!');
    console.error(err);
    process.exit(1);
  });
