import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { IChannelService } from '../types';

interface BookingCredentials {
  apiKey: string;
  apiSecret: string;
}

interface BookingInventory {
  roomId: string;
  date: string;
  available: number;
}

interface BookingPrice {
  roomId: string;
  date: string;
  price: number;
  currency: string;
}

interface BookingReservation {
  reservationId: string;
  roomId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
}

export class BookingService implements IChannelService {
  private client: AxiosInstance;
  private credentials: BookingCredentials;

  constructor(credentials: BookingCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      baseURL: process.env.BOOKING_API_URL || 'https://api.booking.com/v1',
      headers: {
        'Authorization': `Bearer ${credentials.apiKey}`,
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
      await this.client.post('/inventory/update', {
        room_id: roomId,
        date: date,
        available_rooms: available
      });
      logger.info(`[Booking.com] Inventory updated for room ${roomId} on ${date}`);
    } catch (error) {
      logger.error(`[Booking.com] Failed to update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 업데이트
   */
  async updatePrice(roomId: string, date: string, price: number): Promise<void> {
    try {
      await this.client.post('/pricing/update', {
        room_id: roomId,
        date: date,
        price: price,
        currency: 'KRW'
      });
      logger.info(`[Booking.com] Price updated for room ${roomId} on ${date}`);
    } catch (error) {
      logger.error(`[Booking.com] Failed to update price: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 조회
   */
  async getReservations(startDate: string, endDate: string): Promise<BookingReservation[]> {
    try {
      const response = await this.client.get('/reservations', {
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });

      logger.info(`[Booking.com] Retrieved ${response.data.reservations.length} reservations`);
      return response.data.reservations.map((res: any) => ({
        reservationId: res.reservation_id,
        roomId: res.room_id,
        guestName: res.guest_name,
        guestEmail: res.guest_email,
        checkIn: res.check_in,
        checkOut: res.check_out,
        numberOfGuests: res.number_of_guests,
        totalPrice: res.total_price,
        status: res.status
      }));
    } catch (error) {
      logger.error(`[Booking.com] Failed to get reservations: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 취소
   */
  async cancelReservation(reservationId: string): Promise<void> {
    try {
      await this.client.post(`/reservations/${reservationId}/cancel`);
      logger.info(`[Booking.com] Reservation ${reservationId} cancelled`);
    } catch (error) {
      logger.error(`[Booking.com] Failed to cancel reservation: ${error}`);
      throw error;
    }
  }

  /**
   * 재고 일괄 업데이트
   */
  async bulkUpdateInventory(updates: BookingInventory[]): Promise<void> {
    try {
      await this.client.post('/inventory/bulk-update', {
        updates: updates.map(u => ({
          room_id: u.roomId,
          date: u.date,
          available_rooms: u.available
        }))
      });
      logger.info(`[Booking.com] Bulk inventory update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[Booking.com] Failed to bulk update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 일괄 업데이트
   */
  async bulkUpdatePrice(updates: BookingPrice[]): Promise<void> {
    try {
      await this.client.post('/pricing/bulk-update', {
        updates: updates.map(u => ({
          room_id: u.roomId,
          date: u.date,
          price: u.price,
          currency: u.currency
        }))
      });
      logger.info(`[Booking.com] Bulk price update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[Booking.com] Failed to bulk update prices: ${error}`);
      throw error;
    }
  }
}
