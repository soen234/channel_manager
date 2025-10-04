import { PrismaClient } from '@prisma/client';
import { Channel, SyncType, SyncStatus } from '../types/enums';
import { BookingService } from '../channels/booking/booking.service';
import { YanoljaService } from '../channels/yanolja/yanolja.service';
import { AirbnbService } from '../channels/airbnb/airbnb.service';
import { logger } from '../utils/logger';
import { IChannelService } from '../channels/types';

export class SyncService {
  private prisma: PrismaClient;
  private channelServices: Map<Channel, IChannelService>;

  constructor() {
    this.prisma = new PrismaClient();
    this.channelServices = new Map();
  }

  /**
   * 채널 서비스 초기화
   */
  private getChannelService(channel: string, credentials: any): IChannelService {
    if (this.channelServices.has(channel as any)) {
      return this.channelServices.get(channel as any)!;
    }

    let service: IChannelService;

    switch (channel) {
      case Channel.BOOKING_COM:
        service = new BookingService(credentials);
        break;
      case Channel.YANOLJA:
        service = new YanoljaService(credentials);
        break;
      case Channel.AIRBNB:
        service = new AirbnbService(credentials);
        break;
      default:
        throw new Error(`Unsupported channel: ${channel}`);
    }

    this.channelServices.set(channel as any, service);
    return service;
  }

  /**
   * 재고 동기화 (내부 → 채널)
   */
  async syncInventoryToChannels(roomId: string, startDate: Date, endDate: Date): Promise<void> {
    const log = await this.prisma.syncLog.create({
      data: {
        channel: Channel.BOOKING_COM, // 임시, 실제로는 모든 채널 순회
        syncType: SyncType.INVENTORY,
        status: SyncStatus.IN_PROGRESS
      }
    });

    try {
      // 1. 해당 객실의 채널 매핑 조회
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        include: {
          property: {
            include: {
              channelMappings: {
                where: { isActive: true }
              }
            }
          },
          channelRoomMappings: {
            where: { isActive: true }
          }
        }
      });

      if (!room) {
        throw new Error(`Room not found: ${roomId}`);
      }

      // 2. 기간별 재고 조회
      const inventories = await this.prisma.inventory.findMany({
        where: {
          roomId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      // 3. 각 채널에 업데이트
      for (const mapping of room.channelRoomMappings) {
        const channelMapping = room.property.channelMappings.find(
          (cm: any) => cm.channel === mapping.channel
        );

        if (!channelMapping) continue;

        const service = this.getChannelService(mapping.channel, channelMapping.credentials);

        for (const inventory of inventories) {
          await service.updateInventory(
            mapping.channelRoomId,
            inventory.date.toISOString().split('T')[0],
            inventory.available
          );
        }

        logger.info(`Synced ${inventories.length} inventory items to ${mapping.channel}`);
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date()
        }
      });

    } catch (error) {
      logger.error(`Inventory sync failed: ${error}`);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.FAILED,
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
      throw error;
    }
  }

  /**
   * 요금 동기화 (내부 → 채널)
   */
  async syncPricingToChannels(roomId: string, startDate: Date, endDate: Date): Promise<void> {
    const log = await this.prisma.syncLog.create({
      data: {
        channel: Channel.BOOKING_COM,
        syncType: SyncType.PRICING,
        status: SyncStatus.IN_PROGRESS
      }
    });

    try {
      const room = await this.prisma.room.findUnique({
        where: { id: roomId },
        include: {
          property: {
            include: {
              channelMappings: {
                where: { isActive: true }
              }
            }
          },
          channelRoomMappings: {
            where: { isActive: true }
          }
        }
      });

      if (!room) {
        throw new Error(`Room not found: ${roomId}`);
      }

      const pricings = await this.prisma.pricing.findMany({
        where: {
          roomId,
          date: {
            gte: startDate,
            lte: endDate
          }
        }
      });

      for (const mapping of room.channelRoomMappings) {
        const channelMapping = room.property.channelMappings.find(
          (cm: any) => cm.channel === mapping.channel
        );

        if (!channelMapping) continue;

        const service = this.getChannelService(mapping.channel, channelMapping.credentials);

        for (const pricing of pricings) {
          await service.updatePrice(
            mapping.channelRoomId,
            pricing.date.toISOString().split('T')[0],
            Number(pricing.price)
          );
        }

        logger.info(`Synced ${pricings.length} pricing items to ${mapping.channel}`);
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date()
        }
      });

    } catch (error) {
      logger.error(`Pricing sync failed: ${error}`);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.FAILED,
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
      throw error;
    }
  }

  /**
   * 예약 동기화 (채널 → 내부)
   */
  async syncReservationsFromChannels(channel: string, startDate: Date, endDate: Date): Promise<void> {
    const log = await this.prisma.syncLog.create({
      data: {
        channel,
        syncType: SyncType.RESERVATION,
        status: SyncStatus.IN_PROGRESS
      }
    });

    try {
      // 해당 채널의 매핑 조회
      const channelMappings = await this.prisma.channelMapping.findMany({
        where: {
          channel,
          isActive: true
        }
      });

      for (const mapping of channelMappings) {
        const service = this.getChannelService(channel, mapping.credentials);

        const reservations = await service.getReservations(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        for (const res of reservations) {
          // 채널 객실 ID로 내부 객실 ID 찾기
          const roomMapping = await this.prisma.channelRoomMapping.findFirst({
            where: {
              channel,
              channelRoomId: res.roomId || res.listingId
            }
          });

          if (!roomMapping) {
            logger.warn(`Room mapping not found for channel room: ${res.roomId || res.listingId}`);
            continue;
          }

          // 예약 생성 또는 업데이트
          await this.prisma.reservation.upsert({
            where: {
              channel_channelReservationId: {
                channel,
                channelReservationId: res.reservationId || res.confirmationCode
              }
            },
            create: {
              roomId: roomMapping.roomId,
              channel,
              channelReservationId: res.reservationId || res.confirmationCode,
              guestName: res.guestName,
              guestEmail: res.guestEmail,
              guestPhone: res.guestPhone,
              checkIn: new Date(res.checkIn),
              checkOut: new Date(res.checkOut),
              numberOfGuests: res.numberOfGuests,
              totalPrice: res.totalPrice,
              status: 'CONFIRMED'
            },
            update: {
              guestName: res.guestName,
              guestEmail: res.guestEmail,
              guestPhone: res.guestPhone,
              checkIn: new Date(res.checkIn),
              checkOut: new Date(res.checkOut),
              numberOfGuests: res.numberOfGuests,
              totalPrice: res.totalPrice
            }
          });

          // 재고 차감
          const checkInDate = new Date(res.checkIn);
          const checkOutDate = new Date(res.checkOut);

          for (let d = new Date(checkInDate); d < checkOutDate; d.setDate(d.getDate() + 1)) {
            await this.prisma.inventory.updateMany({
              where: {
                roomId: roomMapping.roomId,
                date: new Date(d)
              },
              data: {
                available: {
                  decrement: 1
                }
              }
            });
          }
        }

        logger.info(`Synced ${reservations.length} reservations from ${channel}`);
      }

      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.SUCCESS,
          completedAt: new Date()
        }
      });

    } catch (error) {
      logger.error(`Reservation sync failed: ${error}`);
      await this.prisma.syncLog.update({
        where: { id: log.id },
        data: {
          status: SyncStatus.FAILED,
          message: error instanceof Error ? error.message : 'Unknown error',
          completedAt: new Date()
        }
      });
      throw error;
    }
  }

  /**
   * 전체 동기화
   */
  async fullSync(): Promise<void> {
    logger.info('Starting full sync...');

    const now = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 12); // 향후 1년

    // 모든 활성 채널에서 예약 동기화
    for (const channel of [Channel.BOOKING_COM, Channel.YANOLJA, Channel.AIRBNB]) {
      await this.syncReservationsFromChannels(channel, now, endDate);
    }

    logger.info('Full sync completed');
  }
}
