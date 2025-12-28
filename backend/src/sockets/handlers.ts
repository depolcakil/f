
import { Server, Socket } from 'socket.io';
import AidRequest from '../models/aidRequest.model';
import User from '../models/user.model';
import Notification from '../models/notification.model';
import { TruckStatus } from '../types/types';

export const handleSocketEvents = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('updateLocation', async (data) => {
      const { driverId, location } = data;
      try {
        await User.findByIdAndUpdate(driverId, { 'truckDetails.location': location });
        io.emit('locationUpdate', { driverId, location });
      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    socket.on('aidRequestCreated', async (aidRequest) => {
      const newNotification = new Notification({
        userId: aidRequest.senderId,
        title: 'Aid Request Created',
        message: `Your aid request for ${aidRequest.aidType} has been created.`,
        type: 'SUCCESS',
        requestId: aidRequest._id,
      });
      await newNotification.save();
      io.to(aidRequest.senderId.toString()).emit('newNotification', newNotification);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
