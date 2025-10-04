import { Router } from 'express';
import { ReservationController } from '../controllers/reservation.controller';

const router = Router();
const controller = new ReservationController();

router.get('/', controller.getDashboardStats);

export default router;
