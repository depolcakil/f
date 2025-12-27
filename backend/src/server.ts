
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import aidRequestRoutes from './routes/aidRequest.routes';
import notificationRoutes from './routes/notification.routes';
import { attachIO } from './middleware/io.middleware';
import cluster from 'cluster';
import os from 'os';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

dotenv.config();

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  connectDB();
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

  app.use(attachIO(io));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/aid-requests', aidRequestRoutes);
  app.use('/api/notifications', notificationRoutes);

  io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('disconnect', () => {
      console.log('user disconnected');
    });
  });

  const PORT = process.env.PORT || 5000;

  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}
