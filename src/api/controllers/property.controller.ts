import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { logger } from '../../utils/logger';

const prisma = new PrismaClient();

export class PropertyController {
  /**
   * 숙소 생성
   */
  async createProperty(req: Request, res: Response): Promise<void> {
    try {
      const { name, address, description } = req.body;

      const property = await prisma.property.create({
        data: { name, address, description }
      });

      res.status(201).json(property);
    } catch (error) {
      logger.error(`Error creating property: ${error}`);
      res.status(500).json({ error: 'Failed to create property' });
    }
  }

  /**
   * 숙소 목록 조회
   */
  async getProperties(req: Request, res: Response): Promise<void> {
    try {
      const properties = await prisma.property.findMany({
        include: {
          rooms: true,
          channelMappings: true
        }
      });

      res.json(properties);
    } catch (error) {
      logger.error(`Error fetching properties: ${error}`);
      res.status(500).json({ error: 'Failed to fetch properties' });
    }
  }

  /**
   * 숙소 상세 조회
   */
  async getProperty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const property = await prisma.property.findUnique({
        where: { id },
        include: {
          rooms: {
            include: {
              channelRoomMappings: true
            }
          },
          channelMappings: true
        }
      });

      if (!property) {
        res.status(404).json({ error: 'Property not found' });
        return;
      }

      res.json(property);
    } catch (error) {
      logger.error(`Error fetching property: ${error}`);
      res.status(500).json({ error: 'Failed to fetch property' });
    }
  }

  /**
   * 숙소 정보 수정
   */
  async updateProperty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, address, description } = req.body;

      const property = await prisma.property.update({
        where: { id },
        data: { name, address, description }
      });

      res.json(property);
    } catch (error) {
      logger.error(`Error updating property: ${error}`);
      res.status(500).json({ error: 'Failed to update property' });
    }
  }

  /**
   * 숙소 삭제
   */
  async deleteProperty(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      await prisma.property.delete({
        where: { id }
      });

      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting property: ${error}`);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  }

  /**
   * 객실 생성
   */
  async createRoom(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId } = req.params;
      const { name, type, totalRooms, capacity, basePrice } = req.body;

      const room = await prisma.room.create({
        data: {
          propertyId,
          name,
          type,
          totalRooms: totalRooms || 1,
          capacity,
          basePrice
        }
      });

      res.status(201).json(room);
    } catch (error) {
      logger.error(`Error creating room: ${error}`);
      res.status(500).json({ error: 'Failed to create room' });
    }
  }

  /**
   * 객실 목록 조회
   */
  async getRooms(req: Request, res: Response): Promise<void> {
    try {
      const { propertyId } = req.params;

      const rooms = await prisma.room.findMany({
        where: { propertyId },
        include: {
          channelRoomMappings: true
        }
      });

      res.json(rooms);
    } catch (error) {
      logger.error(`Error fetching rooms: ${error}`);
      res.status(500).json({ error: 'Failed to fetch rooms' });
    }
  }

  /**
   * 객실 정보 수정
   */
  async updateRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const { name, type, totalRooms, capacity, basePrice } = req.body;

      const room = await prisma.room.update({
        where: { id: roomId },
        data: {
          name,
          type,
          ...(totalRooms !== undefined && { totalRooms }),
          capacity,
          basePrice
        }
      });

      res.json(room);
    } catch (error) {
      logger.error(`Error updating room: ${error}`);
      res.status(500).json({ error: 'Failed to update room' });
    }
  }

  /**
   * 객실 삭제
   */
  async deleteRoom(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;

      await prisma.room.delete({
        where: { id: roomId }
      });

      res.status(204).send();
    } catch (error) {
      logger.error(`Error deleting room: ${error}`);
      res.status(500).json({ error: 'Failed to delete room' });
    }
  }
}
