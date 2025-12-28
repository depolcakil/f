
import { Schema, model, Document } from 'mongoose';
import { UserRole, RegistrationStatus, TruckStatus } from '../types/types';

interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  status: RegistrationStatus;
  truckDetails?: {
    licensePlate: string;
    model: string;
    capacity: string;
    driverLicense: string;
    experienceYears: string;
    location?: { lat: number; lng: number };
    currentStatus: TruckStatus;
  };
  organizationDetails?: {
    name: string;
    type: string;
    regNumber: string;
    sector: string;
    headquarters: string;
  };
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['DRIVER', 'SENDER', 'ADMIN'], required: true },
  status: { type: String, enum: Object.values(RegistrationStatus), default: RegistrationStatus.PENDING },
  truckDetails: {
    licensePlate: { type: String },
    model: { type: String },
    capacity: { type: String },
    driverLicense: { type: String },
    experienceYears: { type: String },
    location: {
      lat: { type: Number },
      lng: { type: Number }
    },
    currentStatus: { type: String, enum: Object.values(TruckStatus) }
  },
  organizationDetails: {
    name: { type: String },
    type: { type: String },
    regNumber: { type: String },
    sector: { type: String },
    headquarters: { type: String }
  }
});

const User = model<IUser>('User', userSchema);

export default User;
