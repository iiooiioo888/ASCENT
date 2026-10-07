-- AFK-BE-2：商行麵包貨架
ALTER TABLE "player_retail_state" ADD COLUMN "shelf_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "player_retail_state" ADD COLUMN "shelf_ask_gold" INTEGER;
ALTER TABLE "player_retail_state" ADD COLUMN "shelf_today_revenue_gold" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "player_retail_state" ADD COLUMN "shelf_revenue_game_day" INTEGER;
ALTER TABLE "player_retail_state" ADD COLUMN "shelf_last_tick_at" DATETIME;
