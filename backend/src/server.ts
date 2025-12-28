
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { handleSocketEvents } from './sockets/handlers';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import aidRequestRoutes from './routes/aidRequest.routes';
import notificationRoutes from './routes/notification.routes';

// Configure dotenv to load the .env file from the backend directory
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

const pubClient = createClient({ url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}` });
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
  .then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Connected to Redis and Socket.IO adapter is set up');
  })
  .catch((err) => {
    console.error('Failed to connect to Redis:', err);
    process.exit(1);
  });

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/aid-requests', aidRequestRoutes);
app.use('/api/notifications', notificationRoutes);

handleSocketEvents(io);

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI!)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
