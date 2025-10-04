// Enum 대체용 상수
export const Channel = {
  BOOKING_COM: 'BOOKING_COM',
  YANOLJA: 'YANOLJA',
  AIRBNB: 'AIRBNB'
} as const;

export type Channel = typeof Channel[keyof typeof Channel];

export const ReservationStatus = {
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  NO_SHOW: 'NO_SHOW'
} as const;

export type ReservationStatus = typeof ReservationStatus[keyof typeof ReservationStatus];

export const SyncType = {
  INVENTORY: 'INVENTORY',
  PRICING: 'PRICING',
  RESERVATION: 'RESERVATION',
  FULL: 'FULL'
} as const;

export type SyncType = typeof SyncType[keyof typeof SyncType];

export const SyncStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED'
} as const;

export type SyncStatus = typeof SyncStatus[keyof typeof SyncStatus];
