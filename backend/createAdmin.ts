
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { User } from './src/models/user.model';

dotenv.config();

const createAdmin = async () => {
  if (!process.env.ADMIN_PASSWORD) {
    console.error('Error: ADMIN_PASSWORD environment variable is not set.');
    console.error('Please set the ADMIN_PASSWORD in your .env file before running this script.');
    return;
  }

  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI environment variable is not set.');
    console.error('Please set the MONGO_URI in your .env file before running this script.');
    return;
  }

  await mongoose.connect(process.env.MONGO_URI);

  const adminExists = await User.findOne({ email: 'admin@ethiosafeguard.com' });
  if (adminExists) {
    console.log('Admin user already exists');
    await mongoose.disconnect();
    return;
  }

  const admin = new User({
    name: 'Admin User',
    email: 'admin@ethiosafeguard.com',
    password: process.env.ADMIN_PASSWORD,
    role: 'ADMIN',
    status: 'APPROVED',
  });

  await admin.save();
  console.log('Admin user created');
  await mongoose.disconnect();
};

createAdmin();
