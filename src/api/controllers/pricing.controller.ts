import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../../sync/sync.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const syncService = new SyncService();

export class PricingController {
  /**
   * 요금 업데이트
   */
  async updatePricing(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, date, price, currency } = req.body;

      const pricing = await prisma.pricing.upsert({
        where: {
          roomId_date: {
            roomId,
            date: new Date(date)
          }
        },
        create: {
          roomId,
          date: new Date(date),
          price,
          currency: currency || 'KRW'
        },
        update: {
          price,
          currency: currency || 'KRW'
        }
      });

      res.json(pricing);
    } catch (error) {
      logger.error(`Error updating pricing: ${error}`);
      res.status(500).json({ error: 'Failed to update pricing' });
    }
  }

  /**
   * 요금 조회
   */
  async getPricing(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { startDate, endDate } = req.query;

      const where: any = { roomId };

      if (startDate && endDate) {
        where.date = {
          gte: new Date(startDate as string),
          lte: new Date(endDate as string)
        };
      }

      const pricing = await prisma.pricing.findMany({
        where,
        orderBy: {
          date: 'asc'
        }
      });

      res.json(pricing);
    } catch (error) {
      logger.error(`Error fetching pricing: ${error}`);
      res.status(500).json({ error: 'Failed to fetch pricing' });
    }
  }

  /**
   * 요금 일괄 업데이트
   */
  async bulkUpdatePricing(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body;

      for (const update of updates) {
        await prisma.pricing.upsert({
          where: {
            roomId_date: {
              roomId: update.roomId,
              date: new Date(update.date)
            }
          },
          create: {
            roomId: update.roomId,
            date: new Date(update.date),
            price: update.price,
            currency: update.currency || 'KRW'
          },
          update: {
            price: update.price,
            currency: update.currency || 'KRW'
          }
        });
      }

      res.json({ message: `${updates.length} pricing items updated` });
    } catch (error) {
      logger.error(`Error bulk updating pricing: ${error}`);
      res.status(500).json({ error: 'Failed to bulk update pricing' });
    }
  }

  /**
   * 요금 동기화 (내부 → 채널)
   */
  async syncPricing(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, startDate, endDate } = req.body;

      await syncService.syncPricingToChannels(
        roomId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({ message: 'Pricing sync completed' });
    } catch (error) {
      logger.error(`Error syncing pricing: ${error}`);
      res.status(500).json({ error: 'Failed to sync pricing' });
    }
  }
}
