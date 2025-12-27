
import mongoose, { Schema, model, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['DRIVER', 'SENDER', 'ADMIN'], required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  truckDetails: {
    licensePlate: String,
    model: String,
    capacity: String,
    driverLicense: String,
    experienceYears: String,
    location: { lat: Number, lng: Number },
    currentStatus: { type: String, enum: ['IDLE', 'READY', 'BUSY'] }
  },
  organizationDetails: {
    name: String,
    type: String,
    regNumber: String,
    sector: String,
    headquarters: String,
  },
}, { timestamps: true });

userSchema.pre('save', async function () {
  const user = this as any;
  if (!user.isModified('password')) {
    return;
  }
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

export const User = model('User', userSchema);
