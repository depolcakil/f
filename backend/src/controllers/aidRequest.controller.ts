
import { Request, Response } from 'express';
import { AidRequest } from '../models/aidRequest.model';
import { Notification } from '../models/notification.model';
import { User } from '../models/user.model';

export const getAidRequests = async (req: Request, res: Response) => {
  const requests = await AidRequest.find({}).populate('senderId', 'name').populate('driverId', 'name');
  res.json(requests);
};

export const createAidRequest = async (req: Request, res: Response) => {
  const { aidType, quantity, destination, urgency } = req.body;
  const request = new AidRequest({
    senderId: req.user._id,
    aidType,
    quantity,
    destination,
    urgency,
  });
  const createdRequest = await request.save();

  const admins = await User.find({ role: 'ADMIN' });
  for (const admin of admins) {
    const notification = await Notification.create({
      userId: admin._id,
      title: 'New Aid Request',
      message: `A new aid request has been created by ${req.user.name}.`,
      type: 'INFO',
      requestId: createdRequest._id,
    });
    req.io.emit('notification', notification);
  }

  res.status(201).json(createdRequest);
};

export const updateAidRequestStatus = async (req: Request, res: Response) => {
  const { status, driverId } = req.body;
  const request = await AidRequest.findById(req.params.id);

  if (request) {
    request.status = status;
    if (driverId) {
      request.driverId = driverId;
    }
    const updatedRequest = await request.save();

    const notification = await Notification.create({
      userId: updatedRequest.senderId,
      title: `Request ${updatedRequest.status}`,
      message: `Your aid request has been ${updatedRequest.status}.`,
      type: 'INFO',
      requestId: updatedRequest._id,
    });

    req.io.emit('notification', notification);

    if (updatedRequest.driverId) {
      const driverNotification = await Notification.create({
        userId: updatedRequest.driverId,
        title: `Request ${updatedRequest.status}`,
        message: `An aid request assigned to you has been ${updatedRequest.status}.`,
        type: 'INFO',
        requestId: updatedRequest._id,
      });
      req.io.emit('notification', driverNotification);
    }

    res.json(updatedRequest);
  } else {
    res.status(404).json({ message: 'Request not found' });
  }
};
