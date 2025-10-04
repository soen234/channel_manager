import { Router } from 'express';
import { InventoryController } from '../controllers/inventory.controller';

const router = Router();
const controller = new InventoryController();

// 재고 관리
router.post('/', controller.updateInventory);
router.get('/room/:roomId', controller.getInventory);
router.post('/bulk', controller.bulkUpdateInventory);
router.post('/sync', controller.syncInventory);

export default router;
