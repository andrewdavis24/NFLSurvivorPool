/*
  Warnings:

  - A unique constraint covering the columns `[weekId,team]` on the table `Pick` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Pick_weekId_team_key" ON "Pick"("weekId", "team");
