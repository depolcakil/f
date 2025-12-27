
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { User } from '../models/user.model';
import { Notification } from '../models/notification.model';

export const updateUserLocation = async (req: Request, res: Response) => {
  const idParam = req.params.id;
  let user = null as any;

  try {
    if (idParam && mongoose.Types.ObjectId.isValid(idParam)) {
      user = await User.findById(idParam);
    } else if (req.body?.clientId && mongoose.Types.ObjectId.isValid(String(req.body.clientId))) {
      user = await User.findById(String(req.body.clientId));
    } else if (req.body?.licensePlate) {
      user = await User.findOne({ 'truckDetails.licensePlate': req.body.licensePlate });
    } else if (req.body?.clientId) {
      // try matching clientId to licensePlate or email as fallback
      user = await User.findOne({ 'truckDetails.licensePlate': req.body.clientId }) || await User.findOne({ email: req.body.clientId });
    }
  } catch (err) {
    console.error('Error finding user for location update', err);
    return res.status(400).json({ message: 'Invalid user identifier' });
  }

  if (user && user.role === 'DRIVER') {
    user.truckDetails = user.truckDetails || {};
    user.truckDetails.location = req.body.location;
    const updatedUser = await user.save();
    req.io.emit('locationUpdate', {
      userId: updatedUser._id,
      clientId: req.body?.clientId || updatedUser._id,
      licensePlate: updatedUser.truckDetails?.licensePlate,
      location: updatedUser.truckDetails.location,
    });
    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'Driver not found' });
  }
};

export const getUsers = async (req: Request, res: Response) => {
  const users = await User.find({});
  res.json(users);
};

export const approveUser = async (req: Request, res: Response) => {
  const id = req.params.id;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user id' });
  }
  const user = await User.findById(id);
  if (user) {
    user.status = 'APPROVED';
    const updatedUser = await user.save();

    const notification = await Notification.create({
      userId: user._id,
      title: 'Account Approved',
      message: 'Your account has been approved by an administrator.',
      type: 'SUCCESS',
    });

    req.io.emit('notification', notification);

    res.json(updatedUser);
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};
