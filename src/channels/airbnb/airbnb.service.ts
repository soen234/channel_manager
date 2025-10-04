import axios, { AxiosInstance } from 'axios';
import { logger } from '../../utils/logger';
import { IChannelService } from '../types';

interface AirbnbCredentials {
  clientId: string;
  clientSecret: string;
  accessToken: string;
}

interface AirbnbInventory {
  listingId: string;
  date: string;
  available: boolean;
}

interface AirbnbPrice {
  listingId: string;
  date: string;
  price: number;
  currency: string;
}

interface AirbnbReservation {
  confirmationCode: string;
  listingId: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  numberOfGuests: number;
  totalPrice: number;
  status: string;
}

export class AirbnbService implements IChannelService {
  private client: AxiosInstance;
  private credentials: AirbnbCredentials;

  constructor(credentials: AirbnbCredentials) {
    this.credentials = credentials;
    this.client = axios.create({
      baseURL: process.env.AIRBNB_API_URL || 'https://api.airbnb.com/v2',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'X-Airbnb-OAuth-Token': credentials.accessToken,
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * 재고 업데이트 (Availability)
   */
  async updateInventory(listingId: string, date: string, available: boolean): Promise<void> {
    try {
      await this.client.put(`/calendar_days/${listingId}/${date}`, {
        availability: available ? 'available' : 'unavailable'
      });
      logger.info(`[Airbnb] Inventory updated for listing ${listingId} on ${date}`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 업데이트
   */
  async updatePrice(listingId: string, date: string, price: number): Promise<void> {
    try {
      await this.client.put(`/calendar_days/${listingId}/${date}`, {
        daily_price: price,
        currency: 'KRW'
      });
      logger.info(`[Airbnb] Price updated for listing ${listingId} on ${date}`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to update price: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 조회
   */
  async getReservations(startDate: string, endDate: string): Promise<AirbnbReservation[]> {
    try {
      const response = await this.client.get('/reservations', {
        params: {
          start_date: startDate,
          end_date: endDate,
          status: 'accept,pending'
        }
      });

      logger.info(`[Airbnb] Retrieved ${response.data.reservations.length} reservations`);
      return response.data.reservations.map((res: any) => ({
        confirmationCode: res.confirmation_code,
        listingId: res.listing_id,
        guestName: `${res.guest.first_name} ${res.guest.last_name}`,
        guestEmail: res.guest.email,
        checkIn: res.start_date,
        checkOut: res.end_date,
        numberOfGuests: res.number_of_guests,
        totalPrice: res.total_paid_amount_accurate,
        status: res.status
      }));
    } catch (error) {
      logger.error(`[Airbnb] Failed to get reservations: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 수락
   */
  async acceptReservation(confirmationCode: string): Promise<void> {
    try {
      await this.client.put(`/reservations/${confirmationCode}/accept`);
      logger.info(`[Airbnb] Reservation ${confirmationCode} accepted`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to accept reservation: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 거절
   */
  async declineReservation(confirmationCode: string, reason: string): Promise<void> {
    try {
      await this.client.put(`/reservations/${confirmationCode}/decline`, {
        reason: reason
      });
      logger.info(`[Airbnb] Reservation ${confirmationCode} declined`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to decline reservation: ${error}`);
      throw error;
    }
  }

  /**
   * 예약 취소
   */
  async cancelReservation(confirmationCode: string): Promise<void> {
    try {
      await this.client.post(`/reservations/${confirmationCode}/cancel`);
      logger.info(`[Airbnb] Reservation ${confirmationCode} cancelled`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to cancel reservation: ${error}`);
      throw error;
    }
  }

  /**
   * 재고 일괄 업데이트
   */
  async bulkUpdateInventory(updates: AirbnbInventory[]): Promise<void> {
    try {
      // Airbnb는 일괄 업데이트를 지원하지 않을 수 있으므로 순차 처리
      for (const update of updates) {
        await this.updateInventory(update.listingId, update.date, update.available);
      }
      logger.info(`[Airbnb] Bulk inventory update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to bulk update inventory: ${error}`);
      throw error;
    }
  }

  /**
   * 요금 일괄 업데이트
   */
  async bulkUpdatePrice(updates: AirbnbPrice[]): Promise<void> {
    try {
      // Airbnb는 일괄 업데이트를 지원하지 않을 수 있으므로 순차 처리
      for (const update of updates) {
        await this.updatePrice(update.listingId, update.date, update.price);
      }
      logger.info(`[Airbnb] Bulk price update completed for ${updates.length} items`);
    } catch (error) {
      logger.error(`[Airbnb] Failed to bulk update prices: ${error}`);
      throw error;
    }
  }

  /**
   * 리스팅 정보 조회
   */
  async getListingInfo(listingId: string): Promise<any> {
    try {
      const response = await this.client.get(`/listings/${listingId}`);
      logger.info(`[Airbnb] Retrieved listing info for ${listingId}`);
      return response.data;
    } catch (error) {
      logger.error(`[Airbnb] Failed to get listing info: ${error}`);
      throw error;
    }
  }
}
