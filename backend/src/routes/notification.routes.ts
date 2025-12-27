
import { Router } from 'express';
import { getNotifications, markNotificationAsRead } from '../controllers/notification.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.route('/').get(protect, getNotifications);
router.route('/:id').put(protect, markNotificationAsRead);

export default router;
