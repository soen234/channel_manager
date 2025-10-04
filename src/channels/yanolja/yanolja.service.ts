import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { IChannelService } from '../types';

interface YanoljaCredentials {
  apiKey: string;
  apiSecret: string;
}

interface YanoljaInventory {
  roomId: string;
  date: string;
  available: number;
}

interface YanoljaPrice {
  roomId: string;
  date: string;
  price: number;
  currency: string;
}

interface YanoljaReservation {
  reservationId: string;
  roomId: string;
  guestName: string;
  guestPhone: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
}

export class YanoljaService implements IChannelService {
  private client: AxiosInstance;
  private credentials: YanoljaCredentials;

  constructor(credentials: YanoljaCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      baseURL: process.env.YANOLJA_API_URL || 'https://api.yanolja.com/v1',
      headers: {
        'X-Api-Key': credentials.apiKey,
        'X-Api-Secret': credentials.apiSecret,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 재고 업데이트
   */
  async updateInventory(roomId: string, date: string, available: number): Promise<void> {
    try {
      await this.client.put('/rooms/inventory', {
        roomCode: roomId,
        salesDate: date,
        availableCount: available
      });
      logger.info(`[야놀자] Inventory updated for room ${roomId} on ${date}`);
    } catch (error) {
      logger.error(`[야놀자] Failed to update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 업데이트
   */
  async updatePrice(roomId: string, date: string, price: number): Promise<void> {
    try {
      await this.client.put('/rooms/price', {
        roomCode: roomId,
        salesDate: date,
        salePrice: price
      });
      logger.info(`[야놀자] Price updated for room ${roomId} on ${date}`);
    } catch (error) {
      logger.error(`[야놀자] Failed to update price: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 조회
   */
  async getReservations(startDate: string, endDate: string): Promise<YanoljaReservation[]> {
    try {
      const response = await this.client.get('/reservations', {
        params: {
          checkInFrom: startDate,
          checkInTo: endDate
        }
      });

      logger.info(`[야놀자] Retrieved ${response.data.data.length} reservations`);
      return response.data.data.map((res: any) => ({
        reservationId: res.reservationNo,
        roomId: res.roomCode,
        guestName: res.guestName,
        guestPhone: res.guestPhone,
        checkIn: res.checkInDate,
        checkOut: res.checkOutDate,
        numberOfGuests: res.guestCount,
        totalPrice: res.totalAmount,
        status: res.reservationStatus
      }));
    } catch (error) {
      logger.error(`[야놀자] Failed to get reservations: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 취소
   */
  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await this.client.post(`/reservations/${reservationId}/cancel`, {
        cancelReason: 'Host cancelled'
      });
      logger.info(`[야놀자] Reservation ${reservationId} cancelled`);
    } catch (error) {
      logger.error(`[야놀자] Failed to cancel reservation: ${error}`);
      throw error;
    }
  }

  /**
   * 재고 일괄 업데이트
   */
  async bulkUpdateInventory(updates: YanoljaInventory[]): Promise<void> {
    try {
      await this.client.put('/rooms/inventory/bulk', {
        inventories: updates.map(u => ({
          roomCode: u.roomId,
          salesDate: u.date,
          availableCount: u.available
        }))
      });
      logger.info(`[야놀자] Bulk inventory update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[야놀자] Failed to bulk update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 일괄 업데이트
   */
  async bulkUpdatePrice(updates: YanoljaPrice[]): Promise<void> {
    try {
      await this.client.put('/rooms/price/bulk', {
        prices: updates.map(u => ({
          roomCode: u.roomId,
          salesDate: u.date,
          salePrice: u.price
        }))
      });
      logger.info(`[야놀자] Bulk price update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[야놀자] Failed to bulk update prices: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 확정 처리
   */
  async confirmReservation(reservationId: string): Promise<void> {
    try {
      await this.client.post(`/reservations/${reservationId}/confirm`);
      logger.info(`[야놀자] Reservation ${reservationId} confirmed`);
    } catch (error) {
      logger.error(`[야놀자] Failed to confirm reservation: ${error}`);
      throw error;
    }
  }
}
