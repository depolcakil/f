
import { Server, Socket } from 'socket.io';
import AidRequest from '../models/aidRequest.model';
import User from '../models/user.model';
import Notification from '../models/notification.model';
import { TruckStatus } from '../types/types';

export const handleSocketEvents = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Room management for specific aid requests
    socket.on('joinAidRequestRoom', (aidRequestId: string) => {
      socket.join(aidRequestId);
      console.log(`Socket ${socket.id} joined room for Aid Request ${aidRequestId}`);
    });

    // Renamed and improved for better scoping
    socket.on('driver:locationUpdate', async (data) => {
      const { driverId, aidRequestId, location } = data;
      if (!driverId || !aidRequestId || !location) {
        console.error('Invalid location update data:', data);
        return;
      }

      try {
        // 1. Update the driver's location in the database
        await User.findByIdAndUpdate(driverId, { 'truckDetails.location': location });

        // 2. Broadcast the location update to the specific aid request room
        // This ensures only the sender of this request gets the update.
        io.to(aidRequestId).emit('locationUpdated', { driverId, location });

      } catch (error) {
        console.error('Error updating location:', error);
      }
    });

    socket.on('driver:milestone', (data) => {
      const { aidRequestId, milestone } = data;
      if (!aidRequestId || !milestone) {
        console.error('Invalid milestone data:', data);
        return;
      }
      // Broadcast the milestone to the specific aid request room
      io.to(aidRequestId).emit('milestoneReported', { milestone });
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
