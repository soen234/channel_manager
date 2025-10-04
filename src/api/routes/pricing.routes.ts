import { Router } from 'express';
import { PricingController } from '../controllers/pricing.controller';

const router = Router();
const controller = new PricingController();

// 요금 관리
router.post('/', controller.updatePricing);
router.get('/room/:roomId', controller.getPricing);
router.post('/bulk', controller.bulkUpdatePricing);
router.post('/sync', controller.syncPricing);

export default router;
