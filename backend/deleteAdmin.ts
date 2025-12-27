
import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { User } from './src/models/user.model';

dotenv.config();

const deleteAdmin = async () => {
  await mongoose.connect(process.env.MONGO_URI!);

  await User.deleteOne({ email: 'admin@ethiosafeguard.com' });
  console.log('Admin user deleted');
  await mongoose.disconnect();
};

deleteAdmin();
