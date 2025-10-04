import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';

const router = Router();
const controller = new ReservationController();

// 예약 관리
router.get('/', controller.getReservations);
router.get('/:id', controller.getReservation);
router.put('/:id/status', controller.updateReservationStatus);
router.post('/sync', controller.syncReservations);

export default router;
