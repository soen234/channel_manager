import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { SyncService } from '../../sync/sync.service';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();
const syncService = new SyncService();

export class InventoryController {
  /**
   * 재고 업데이트
   */
  async updateInventory(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, date, available, total } = req.body;

      const inventory = await prisma.inventory.upsert({
        where: {
          roomId_date: {
            roomId,
            date: new Date(date)
          }
        },
        create: {
          roomId,
          date: new Date(date),
          available,
          total: total || available
        },
        update: {
          available,
          total: total || available
        }
      });

      res.json(inventory);
    } catch (error) {
      logger.error(`Error updating inventory: ${error}`);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  }

  /**
   * 재고 조회
   */
  async getInventory(req: Request, res: Response): Promise<void> {
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

      const inventory = await prisma.inventory.findMany({
        where,
        orderBy: {
          date: 'asc'
        }
      });

      res.json(inventory);
    } catch (error) {
      logger.error(`Error fetching inventory: ${error}`);
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  }

  /**
   * 재고 일괄 업데이트
   */
  async bulkUpdateInventory(req: Request, res: Response): Promise<void> {
    try {
      const { updates } = req.body;

      for (const update of updates) {
        await prisma.inventory.upsert({
          where: {
            roomId_date: {
              roomId: update.roomId,
              date: new Date(update.date)
            }
          },
          create: {
            roomId: update.roomId,
            date: new Date(update.date),
            available: update.available,
            total: update.total || update.available
          },
          update: {
            available: update.available,
            total: update.total || update.available
          }
        });
      }

      res.json({ message: `${updates.length} inventory items updated` });
    } catch (error) {
      logger.error(`Error bulk updating inventory: ${error}`);
      res.status(500).json({ error: 'Failed to bulk update inventory' });
    }
  }

  /**
   * 재고 동기화 (내부 → 채널)
   */
  async syncInventory(req: Request, res: Response): Promise<void> {
    try {
      const { roomId, startDate, endDate } = req.body;

      await syncService.syncInventoryToChannels(
        roomId,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({ message: 'Inventory sync completed' });
    } catch (error) {
      logger.error(`Error syncing inventory: ${error}`);
      res.status(500).json({ error: 'Failed to sync inventory' });
    }
  }
}
