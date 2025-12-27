
import { Schema, model, Document } from 'mongoose';

const aidRequestSchema = new Schema({
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  driverId: { type: Schema.Types.ObjectId, ref: 'User' },
  aidType: { type: String, required: true },
  quantity: { type: String, required: true },
  destination: { type: String, required: true },
  urgency: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
}, { timestamps: true });

export const AidRequest = model('AidRequest', aidRequestSchema);
