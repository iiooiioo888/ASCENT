-- AlterTable
ALTER TABLE "players" ADD COLUMN "workforce_hired" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "players" ADD COLUMN "workforce_busy" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "game_config" ADD COLUMN "ops_depth" TEXT;
