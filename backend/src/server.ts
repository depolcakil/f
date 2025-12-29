
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import cluster from 'cluster';
import os from 'os';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import User from './models/user.model';
import { handleSocketEvents } from './sockets/handlers';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import aidRequestRoutes from './routes/aidRequest.routes';
import notificationRoutes from './routes/notification.routes';
import { RegistrationStatus } from './types/types';

// Load environment variables from .env file
dotenv.config();

const numCPUs = os.cpus().length;

const {
  MONGO_URI = 'mongodb://127.0.0.1:27017/ethiosafeguard',
  REDIS_URL = 'redis://127.0.0.1:6379',
  PORT = 5000,
  JWT_SECRET = 'your_default_secret'
} = process.env;

const createAdminAccount = async () => {
  try {
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    if (existingAdmin) {
      console.log('Admin account already exists.');
      return;
    }
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

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`Worker ${process.pid} connected to MongoDB.`);
    await createAdminAccount();

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Pass JWT secret to routes
    app.use((req, res, next) => {
      req.app.set('jwt_secret', JWT_SECRET);
      next();
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/aid-requests', aidRequestRoutes);
    app.use('/api/notifications', notificationRoutes);

    const server = http.createServer(app);
    const io = new Server(server, {
      cors: { origin: '*' },
      adapter: createAdapter(),
    });

    handleSocketEvents(io);

    server.listen(PORT, () => {
      console.log(`Worker ${process.pid} started. Server running on port ${PORT}.`);
    });

  } catch (err) {
    console.error(`Worker ${process.pid} failed to start.`, err);
    process.exit(1);
  }
};

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Setup sticky sessions
  const primary = http.createServer();
  setupPrimary();

  cluster.on('exit', (worker) => {
    console.log(`worker ${worker.process.pid} died`);
    cluster.fork();
  });

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

} else {
  startServer();
}
