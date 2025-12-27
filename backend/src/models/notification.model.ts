
import { Schema, model, Document } from 'mongoose';

const notificationSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['INFO', 'SUCCESS', 'WARNING'], required: true },
  read: { type: Boolean, default: false },
  requestId: { type: Schema.Types.ObjectId, ref: 'AidRequest' },
}, { timestamps: true });

export const Notification = model('Notification', notificationSchema);
