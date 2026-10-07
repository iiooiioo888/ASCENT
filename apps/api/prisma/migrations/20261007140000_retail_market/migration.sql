-- AlterTable
ALTER TABLE "game_config" ADD COLUMN "retail_config" TEXT;

-- CreateTable
CREATE TABLE "player_retail_state" (
    "player_id" TEXT NOT NULL PRIMARY KEY,
    "offers" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "player_retail_state_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "players" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
