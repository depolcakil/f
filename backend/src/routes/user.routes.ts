
import { Router } from 'express';
import {
  getUsers,
  approveUser,
  updateUserLocation,
  updateDriverStatus,
  getAvailableDrivers,
} from '../controllers/user.controller';
import { protect, admin } from '../middleware/auth.middleware';

const router = Router();

router.route('/').get(protect, admin, getUsers);
router.route('/available').get(protect, getAvailableDrivers);
router.route('/driver/status').put(protect, updateDriverStatus);
router.route('/:id/approve').put(protect, admin, approveUser);
router.route('/:id/location').put(protect, updateUserLocation);

export default router;
