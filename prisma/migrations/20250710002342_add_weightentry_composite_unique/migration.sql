/*
  Warnings:

  - A unique constraint covering the columns `[userId,weekStart]` on the table `WeightEntry` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "WeightEntry_userId_weekStart_key" ON "WeightEntry"("userId", "weekStart");
