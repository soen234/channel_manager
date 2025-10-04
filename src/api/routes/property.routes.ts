import { Router } from 'express';
import { PropertyController } from '../controllers/property.controller';

const router = Router();
const controller = new PropertyController();

// 숙소 관리
router.post('/', controller.createProperty);
router.get('/', controller.getProperties);
router.get('/:id', controller.getProperty);
router.put('/:id', controller.updateProperty);
router.delete('/:id', controller.deleteProperty);

// 객실 관리
router.post('/:propertyId/rooms', controller.createRoom);
router.get('/:propertyId/rooms', controller.getRooms);
router.put('/:propertyId/rooms/:roomId', controller.updateRoom);
router.delete('/:propertyId/rooms/:roomId', controller.deleteRoom);

export default router;
