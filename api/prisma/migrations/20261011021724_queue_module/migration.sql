/*
  Warnings:

  - A unique constraint covering the columns `[businessId,queueDate,number]` on the table `queue_tickets` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "queue_tickets_businessId_queueDate_number_key" ON "queue_tickets"("businessId", "queueDate", "number");
