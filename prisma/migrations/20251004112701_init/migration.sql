-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL DEFAULT 1,
    "capacity" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelMapping" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "channelPropertyId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "credentials" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelRoomMapping" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "channelRoomId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelRoomMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inventory" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "available" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pricing" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "channelReservationId" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "checkIn" TIMESTAMP(3) NOT NULL,
    "checkOut" TIMESTAMP(3) NOT NULL,
    "numberOfGuests" INTEGER NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "syncType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "message" TEXT,
    "errorDetail" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Room_propertyId_idx" ON "Room"("propertyId");

-- CreateIndex
CREATE INDEX "ChannelMapping_propertyId_idx" ON "ChannelMapping"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelMapping_propertyId_channel_key" ON "ChannelMapping"("propertyId", "channel");

-- CreateIndex
CREATE INDEX "ChannelRoomMapping_roomId_idx" ON "ChannelRoomMapping"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "ChannelRoomMapping_roomId_channel_key" ON "ChannelRoomMapping"("roomId", "channel");

-- CreateIndex
CREATE INDEX "Inventory_roomId_date_idx" ON "Inventory"("roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Inventory_roomId_date_key" ON "Inventory"("roomId", "date");

-- CreateIndex
CREATE INDEX "Pricing_roomId_date_idx" ON "Pricing"("roomId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Pricing_roomId_date_key" ON "Pricing"("roomId", "date");

-- CreateIndex
CREATE INDEX "Reservation_roomId_idx" ON "Reservation"("roomId");

-- CreateIndex
CREATE INDEX "Reservation_checkIn_checkOut_idx" ON "Reservation"("checkIn", "checkOut");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_channel_channelReservationId_key" ON "Reservation"("channel", "channelReservationId");

-- CreateIndex
CREATE INDEX "SyncLog_channel_syncType_idx" ON "SyncLog"("channel", "syncType");

-- CreateIndex
CREATE INDEX "SyncLog_startedAt_idx" ON "SyncLog"("startedAt");

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelMapping" ADD CONSTRAINT "ChannelMapping_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChannelRoomMapping" ADD CONSTRAINT "ChannelRoomMapping_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pricing" ADD CONSTRAINT "Pricing_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
