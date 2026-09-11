/*
  Warnings:

  - You are about to drop the column `poolId` on the `Pick` table. All the data in the column will be lost.
  - You are about to drop the column `poolMemberId` on the `Pick` table. All the data in the column will be lost.
  - You are about to drop the column `week` on the `Pick` table. All the data in the column will be lost.
  - You are about to drop the `Pool` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PoolMember` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,weekId]` on the table `Pick` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `Pick` table without a default value. This is not possible if the table is not empty.
  - Added the required column `weekId` to the `Pick` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Pick" DROP CONSTRAINT "Pick_poolId_fkey";

-- DropForeignKey
ALTER TABLE "Pick" DROP CONSTRAINT "Pick_poolMemberId_fkey";

-- DropForeignKey
ALTER TABLE "PoolMember" DROP CONSTRAINT "PoolMember_poolId_fkey";

-- DropForeignKey
ALTER TABLE "PoolMember" DROP CONSTRAINT "PoolMember_userId_fkey";

-- DropIndex
DROP INDEX "Pick_poolMemberId_week_key";

-- AlterTable
ALTER TABLE "Pick" DROP COLUMN "poolId",
DROP COLUMN "poolMemberId",
DROP COLUMN "week",
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userId" INTEGER NOT NULL,
ADD COLUMN     "weekId" INTEGER NOT NULL;

-- DropTable
DROP TABLE "Pool";

-- DropTable
DROP TABLE "PoolMember";

-- CreateTable
CREATE TABLE "Week" (
    "id" SERIAL NOT NULL,
    "week" INTEGER NOT NULL,

    CONSTRAINT "Week_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Week_week_key" ON "Week"("week");

-- CreateIndex
CREATE UNIQUE INDEX "Pick_userId_weekId_key" ON "Pick"("userId", "weekId");

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pick" ADD CONSTRAINT "Pick_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "Week"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
