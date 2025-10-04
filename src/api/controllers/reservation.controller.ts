import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { Channel, ReservationStatus } from '../../types/enums';
import { SyncService } from '../../sync/sync.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const syncService = new SyncService();

export class ReservationController {
  /**
   * 예약 목록 조회
   */
  async getReservations(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, channel, status } = req.query;

      const where: any = {};

      if (startDate && endDate) {
        where.checkIn = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      if (channel) {
        where.channel = channel as string;
      }

      if (status) {
        where.status = status as string;
      }

      const reservations = await prisma.reservation.findMany({
        where,
        include: {
          room: {
            include: {
              property: true
            }
          }
        },
        orderBy: {
          checkIn: 'asc'
        }
      });

      res.json(reservations);
    } catch (error) {
      logger.error(`Error fetching reservations: ${error}`);
      res.status(500).json({ error: 'Failed to fetch reservations' });
    }
  }

  /**
   * 예약 상세 조회
   */
  async getReservation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const reservation = await prisma.reservation.findUnique({
        where: { id },
        include: {
          room: {
            include: {
              property: true
            }
          }
        }
      });

      if (!reservation) {
        res.status(404).json({ error: 'Reservation not found' });
        return;
      }

      res.json(reservation);
    } catch (error) {
      logger.error(`Error fetching reservation: ${error}`);
      res.status(500).json({ error: 'Failed to fetch reservation' });
    }
  }

  /**
   * 예약 상태 변경
   */
  async updateReservationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const reservation = await prisma.reservation.update({
        where: { id },
        data: { status: status as string }
      });

      res.json(reservation);
    } catch (error) {
      logger.error(`Error updating reservation status: ${error}`);
      res.status(500).json({ error: 'Failed to update reservation status' });
    }
  }

  /**
   * 예약 동기화
   */
  async syncReservations(req: Request, res: Response): Promise<void> {
    try {
      const { channel, startDate, endDate } = req.body;

      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

      if (channel) {
        await syncService.syncReservationsFromChannels(channel as string, start, end);
      } else {
        // 모든 채널 동기화
        for (const ch of [Channel.BOOKING_COM, Channel.YANOLJA, Channel.AIRBNB]) {
          await syncService.syncReservationsFromChannels(ch as string, start, end);
        }
      }

      res.json({ message: 'Reservation sync completed' });
    } catch (error) {
      logger.error(`Error syncing reservations: ${error}`);
      res.status(500).json({ error: 'Failed to sync reservations' });
    }
  }

  /**
   * 대시보드 통계
   */
  async getDashboardStats(req: Request, res: Response): Promise<void> {
    try {
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      // 오늘 체크인
      const todayCheckIns = await prisma.reservation.count({
        where: {
          checkIn: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lt: new Date(today.setHours(23, 59, 59, 999))
          },
          status: 'CONFIRMED'
        }
      });

      // 오늘 체크아웃
      const todayCheckOuts = await prisma.reservation.count({
        where: {
          checkOut: {
            gte: new Date(today.setHours(0, 0, 0, 0)),
            lt: new Date(today.setHours(23, 59, 59, 999))
          },
          status: 'CHECKED_IN'
        }
      });

      // 다음 달 예약
      const upcomingReservations = await prisma.reservation.count({
        where: {
          checkIn: {
            gte: today,
            lte: nextMonth
          },
          status: 'CONFIRMED'
        }
      });

      // 채널별 예약 수
      const reservationsByChannel = await prisma.reservation.groupBy({
        by: ['channel'],
        _count: true,
        where: {
          checkIn: {
            gte: today
          }
        }
      });

      res.json({
        todayCheckIns,
        todayCheckOuts,
        upcomingReservations,
        reservationsByChannel
      });
    } catch (error) {
      logger.error(`Error fetching dashboard stats: ${error}`);
      res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
  }
}
