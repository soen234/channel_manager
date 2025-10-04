export interface IChannelService {
  updateInventory(roomId: string, date: string, available: number | boolean): Promise<void>;
  updatePrice(roomId: string, date: string, price: number): Promise<void>;
  getReservations(startDate: string, endDate: string): Promise<any[]>;
  cancelReservation(reservationId: string): Promise<void>;
  bulkUpdateInventory?(updates: any[]): Promise<void>;
  bulkUpdatePrice?(updates: any[]): Promise<void>;
}

export enum ChannelType {
  BOOKING_COM = 'BOOKING_COM',
  YANOLJA = 'YANOLJA',
  AIRBNB = 'AIRBNB'
}

export interface ChannelCredentials {
  type: ChannelType;
  credentials: any;
}
