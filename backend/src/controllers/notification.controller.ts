
import { Request, Response } from 'express';
import { Notification } from '../models/notification.model';

export const getNotifications = async (req: Request, res: Response) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json(notifications);
};

export const markNotificationAsRead = async (req: Request, res: Response) => {
  const notification = await Notification.findById(req.params.id);
  if (notification) {
    notification.read = true;
    const updatedNotification = await notification.save();
    res.json(updatedNotification);
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
};
