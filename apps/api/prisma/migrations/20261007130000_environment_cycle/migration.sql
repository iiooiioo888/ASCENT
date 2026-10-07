-- ENV-BE-1：田休地 + 全域天氣
ALTER TABLE "game_config" ADD COLUMN "environment" JSONB;

ALTER TABLE "server_state" ADD COLUMN "weather" TEXT NOT NULL DEFAULT 'fair';
ALTER TABLE "server_state" ADD COLUMN "weather_next_change_at_game" BIGINT;

ALTER TABLE "player_buildings" ADD COLUMN "fallow_until_game" BIGINT;
