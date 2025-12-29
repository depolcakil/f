
import { Router } from 'express';
import { getAidRequests, createAidRequest, updateAidRequestStatus, completeAidRequest } from '../controllers/aidRequest.controller';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.route('/').get(protect, getAidRequests).post(protect, createAidRequest);
router.route('/:id').put(protect, updateAidRequestStatus);
router.route('/:id/complete').post(protect, completeAidRequest);

export default router;
